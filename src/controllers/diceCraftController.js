const inventoryModel = require('../models/inventoryModel.js');
const userDiceModel = require('../models/userDiceModel.js');
const lootModel = require('../models/lootModel.js');
const diceModifierModel = require('../models/diceModifierModel.js');
const diceCraftService = require('../services/diceCraftService.js');
const { applyDiceMutationInventory } = require('./inventoryController.js');
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
	formatModifierRow,
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

	let loadError = null;
	let dieRow = null;
	let essence = null;
	let pending = 2;

	const afterLoad = () => {
		pending -= 1;
		if (pending > 0) return;

		if (loadError) {
			console.error('Error loading craft inputs:', loadError);
			return res.status(500).json(loadError);
		}
		if (!dieRow) {
			return res.status(404).json({ message: 'Target die not found in your inventory.' });
		}
		if (!essence) {
			return res.status(404).json({ message: 'Essence not found in inventory.' });
		}
		if (essence.quantity <= 0) {
			return res.status(404).json({ message: `You have no more ${essence.name}.` });
		}
		if (!isCraftableMechanic(essence.mechanic)) {
			return res.status(400).json({ message: 'This item cannot be applied to dice.' });
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

			const finishCraft = (writeError, result) => {
				if (writeError) {
					console.error('Error saving die affix:', writeError);
					return res.status(500).json(writeError);
				}

				const modifierId =
					craftAction.action === 'upgrade' ? craftAction.modifierId : result?.insertId;
				const savedModifier = formatModifierRow({
					id: modifierId,
					dice_instance_id: diceInstanceId,
					affix_type: affixType,
					essence_mechanic: essence.mechanic,
					essence_family: essenceFamily,
					modifier_name: modifierName,
					rolled_value: rolledValue,
					source_loot_id: essenceLootId,
					source_rarity: essence.rarity,
					source_name: essence.name,
				});
				const updatedModifiers =
					craftAction.action === 'upgrade'
						? modifiers.map((modifier) =>
								modifier.id === modifierId ? savedModifier : modifier
							)
						: [...modifiers, savedModifier];

				res.locals.craftDieRow = dieRow;
				res.locals.updatedModifiers = updatedModifiers;
				res.locals.consumableLootId = essenceLootId;

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
	};

	userDiceModel.selectById({ userId, diceInstanceId }, (diceError, diceRows) => {
		if (diceError) loadError = diceError;
		else dieRow = diceRows[0] || null;
		afterLoad();
	});

	inventoryModel.getItemFromInventory({ userId, lootId: essenceLootId }, (essenceError, essenceRows) => {
		if (essenceError) loadError = essenceError;
		else essence = essenceRows[0] || null;
		afterLoad();
	});
};

module.exports.finalizeCraft = (req, res, next) => {
	const crafted = res.locals.craftedModifier;
	const verb = res.locals.craftAction === 'upgrade' ? 'Upgraded' : 'Applied';
	const valueText = formatCraftedModifierDisplay(crafted);
	res.locals.message = `${verb} ${crafted.modifier_name} (${valueText}) to your die.`;
	applyDiceMutationInventory(req, res, next);
};

module.exports.attachDiceCraftingData = (req, res, next) => {
	const userId = res.locals.userId;

	diceCraftService.getEquippedCraftingContext(userId, res.locals.user_data, (error, context) => {
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

	diceCraftService.getEquippedCraftingContext(userId, res.locals.user_data, (error, context) => {
		if (error) {
			console.error('Error loading delve crafting data:', error);
			return res.status(500).json(error);
		}

		res.locals.diceModifiers = context.modifiers;
		res.locals.playerBonuses = context.playerBonuses;
		next();
	});
};
