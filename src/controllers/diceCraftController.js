const inventoryModel = require('../models/inventoryModel.js');
const userDiceModel = require('../models/userDiceModel.js');
const lootModel = require('../models/lootModel.js');
const diceModifierModel = require('../models/diceModifierModel.js');
const diceCraftService = require('../services/diceCraftService.js');
const { loadEquippedDice, loadFormattedDiceInstance } = require('./inventoryController.js');
const {
	MAX_PREFIXES,
	MAX_SUFFIXES,
	isCraftableMechanic,
	getEssenceFamily,
	getAffixType,
	getModifierDisplayName,
	rollModifierValue,
	evaluateEssenceCraftAction,
	formatCraftedModifierDisplay,
} = require('../utils/diceEssenceCraft.js');

function consumeEssenceAndRespond(res, next, payload) {
	const { userId, essenceLootId, essence, diceInstanceId, craftAction, craftedModifier } = payload;

	lootModel.decrementQnt({ userId, lootId: essenceLootId }, (decrementError, decrementResult) => {
		if (decrementError) {
			console.error('Error consuming applied essence:', decrementError);
			return res.status(500).json(decrementError);
		}
		if (!decrementResult?.affectedRows) {
			return res.status(404).json({ message: 'Failed to consume essence item.' });
		}

		res.locals.craft_cost = essence.craft_cost;
		res.locals.itemName = essence.name;
		res.locals.targetDiceInstanceId = diceInstanceId;
		res.locals.craftAction = craftAction;
		res.locals.craftedModifier = craftedModifier;
		next();
	});
}

module.exports.craftEssenceOntoDice = (req, res, next) => {
	const userId = res.locals.userId;
	const essenceLootId = parseInt(req.body?.essenceLootId, 10);
	const diceInstanceId = parseInt(req.body?.diceInstanceId, 10);

	if (!Number.isFinite(essenceLootId)) {
		return res.status(400).json({ message: 'Invalid essence item.' });
	}
	if (!Number.isFinite(diceInstanceId)) {
		return res.status(400).json({ message: 'Invalid target die.' });
	}

	userDiceModel.selectById({ userId, diceInstanceId }, (diceError, diceRows) => {
		if (diceError) {
			console.error('Error loading target die:', diceError);
			return res.status(500).json(diceError);
		}
		if (!diceRows[0]) {
			return res.status(404).json({ message: 'Target die not found in your inventory.' });
		}

		inventoryModel.getItemFromInventory({ userId, lootId: essenceLootId }, (essenceError, essenceRows) => {
			if (essenceError) {
				console.error('Error loading essence for craft:', essenceError);
				return res.status(500).json(essenceError);
			}

			const essence = essenceRows[0];
			if (!essence) {
				return res.status(404).json({ message: 'Essence not found in inventory.' });
			}
			if (essence.quantity <= 0) {
				return res.status(404).json({ message: `You have no more ${essence.name}.` });
			}
			if (!isCraftableMechanic(essence.mechanic)) {
				return res.status(400).json({ message: 'This item cannot be applied to dice.' });
			}
			if (essence.craft_cost > res.locals.user_data[0].reputation) {
				return res.status(403).json({ message: 'Not enough reputation to apply this essence.' });
			}

			const essenceFamily = getEssenceFamily(essence.mechanic);
			const affixType = getAffixType(essence.mechanic);
			const affixCap = affixType === 'prefix' ? MAX_PREFIXES : MAX_SUFFIXES;

			diceCraftService.loadModifiers(userId, diceInstanceId, (modifierError, modifiers) => {
				if (modifierError) {
					console.error('Error loading die affixes:', modifierError);
					return res.status(500).json(modifierError);
				}

				const existingModifier = modifiers.find((modifier) => modifier.essence_family === essenceFamily);
				const craftAction = evaluateEssenceCraftAction(existingModifier, essence);

				if (craftAction.action === 'reject') {
					return res.status(409).json({ message: craftAction.message });
				}

				if (craftAction.action === 'insert') {
					const affixCount = modifiers.filter((modifier) => modifier.affix_type === affixType).length;
					if (affixCount >= affixCap) {
						return res.status(409).json({
							message: `This die already has ${affixCap} ${affixType}es.`,
						});
					}
				}

				const rolledValue = rollModifierValue(essence);
				const modifierName = getModifierDisplayName(essence.mechanic);
				const craftedModifier = {
					affix_type: affixType,
					essence_mechanic: essence.mechanic,
					essence_family: essenceFamily,
					modifier_name: modifierName,
					rolled_value: rolledValue,
					source_loot_id: essenceLootId,
					source_rarity: essence.rarity,
					source_name: essence.name,
				};

				const finishCraft = (writeError) => {
					if (writeError) {
						console.error('Error saving die affix:', writeError);
						return res.status(500).json(writeError);
					}

					consumeEssenceAndRespond(res, next, {
						userId,
						essenceLootId,
						essence,
						diceInstanceId,
						craftAction: craftAction.action,
						craftedModifier,
					});
				};

				if (craftAction.action === 'upgrade') {
					diceModifierModel.updateModifier(
						{
							userId,
							modifierId: craftAction.modifierId,
							essenceMechanic: essence.mechanic,
							modifierName,
							rolledValue,
							sourceLootId: essenceLootId,
							sourceRarity: essence.rarity,
						},
						finishCraft
					);
					return;
				}

				diceModifierModel.insertModifier(
					{
						userId,
						diceInstanceId,
						affixType,
						slotIndex: modifiers.length,
						essenceMechanic: essence.mechanic,
						essenceFamily,
						modifierName,
						rolledValue,
						sourceLootId: essenceLootId,
						sourceRarity: essence.rarity,
					},
					finishCraft
				);
			});
		});
	});
};

module.exports.finalizeCraft = (req, res, next) => {
	const userId = res.locals.userId;
	const diceInstanceId = res.locals.targetDiceInstanceId;

	diceCraftService.syncDiceStatsIfEquipped(userId, diceInstanceId, (syncError) => {
		if (syncError) {
			console.error('Error syncing crafted die stats:', syncError);
			return res.status(500).json(syncError);
		}

		diceCraftService.getEquippedCraftingContext(userId, (contextError, context) => {
			if (contextError) {
				console.error('Error loading crafted die context:', contextError);
				return res.status(500).json(contextError);
			}

			const loadPanelDice = (callback) => {
				if (context.equippedDiceId === diceInstanceId) {
					return loadFormattedDiceInstance(userId, diceInstanceId, callback);
				}
				return loadEquippedDice(userId, callback);
			};

			loadPanelDice((equippedError, equippedDice) => {
				if (equippedError) {
					console.error('Error loading equipped die after craft:', equippedError);
					return res.status(500).json(equippedError);
				}

				const crafted = res.locals.craftedModifier;
				const verb = res.locals.craftAction === 'upgrade' ? 'Upgraded' : 'Applied';
				const valueText = formatCraftedModifierDisplay(crafted);
				res.locals.message = `${verb} ${crafted.modifier_name} (${valueText}) to your die.`;
				res.locals.diceModifiers = context.modifiers;
				res.locals.playerBonuses = context.playerBonuses;
				res.locals.equippedDice = equippedDice;
				next();
			});
		});
	});
};

module.exports.attachDiceCraftingData = (req, res, next) => {
	const userId = res.locals.userId;

	diceCraftService.getEquippedCraftingContext(userId, (error, context) => {
		if (error) {
			console.error('Error attaching dice crafting data:', error);
			return res.status(500).json(error);
		}

		res.locals.diceModifiers = context.modifiers;
		res.locals.playerBonuses = context.playerBonuses;
		next();
	});
};

module.exports.attachDelveCraftingData = (req, res, next) => {
	const userId = res.locals.userId;

	diceCraftService.getEquippedCraftingContext(userId, (error, context) => {
		if (error) {
			console.error('Error loading delve crafting data:', error);
			return res.status(500).json(error);
		}

		res.locals.diceModifiers = context.modifiers;
		res.locals.playerBonuses = context.playerBonuses;
		next();
	});
};
