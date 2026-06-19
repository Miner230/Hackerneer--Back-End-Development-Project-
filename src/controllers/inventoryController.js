const inventoryModel = require('../models/inventoryModel.js');
const lootModel = require('../models/lootModel.js');
const userDiceModel = require('../models/userDiceModel.js');
const diceGearModel = require('../models/diceGearModel.js');
const diceModel = require('../models/diceModel.js');
const userModel = require('../models/userModel.js');
const diceCraftService = require('../services/diceCraftService.js');
const diceModifierModel = require('../models/diceModifierModel.js');
const diceSocketModel = require('../models/diceSocketModel.js');
const {
	buildCraftedDiceName,
	computeEffectiveDiceStats,
	isCraftableMechanic,
	isEssenceAffixModifier,
	formatModifierRow,
	buildImplicitModifiers,
	buildEffectiveStatRows,
	computePlayerBonusesFromModifiers,
} = require('../utils/diceEssenceCraft.js');
const { formatSocketRow, isSocketableMechanic } = require('../utils/diceSockets.js');

const ADMIN_CRAFTING_MATERIAL_QUANTITY = 999;
const ADMIN_DICE_GRANT_COUNT = 2;

function formatUserDiceInventoryRow(row, modifiers = [], sockets = []) {
	const essenceModifiers = modifiers.filter(isEssenceAffixModifier);
	const implicits = buildImplicitModifiers(row);

	return {
		id: row.id,
		dice_instance_id: row.id,
		loot_id: row.loot_id,
		quantity: 1,
		is_unique_dice: true,
		name: row.name,
		crafted_name: buildCraftedDiceName(row.name, essenceModifiers),
		mechanic: row.mechanic,
		stat_description: row.stat_description,
		statline: row.statline,
		lore: row.lore,
		rarity: row.rarity || 'Common',
		drop_rarity_score: Number(row.drop_rarity_score) || 100,
		craft_cost: row.craft_cost,
		image_key: row.image_key,
		item_level: Number(row.item_level) || 1,
		socket_count: Number(row.socket_count) || 0,
		implicits,
		modifiers: essenceModifiers,
		sockets,
	};
}

function formatEquippedDice(row, modifiers = [], sockets = []) {
	if (!row?.loot_id || !row?.image_key) return null;

	const essenceModifiers = modifiers.filter(isEssenceAffixModifier);
	const craftedName = buildCraftedDiceName(row.name, essenceModifiers);
	const effectiveStats = computeEffectiveDiceStats(row, essenceModifiers, sockets);
	const playerBonuses = computePlayerBonusesFromModifiers(essenceModifiers);
	const implicits = buildImplicitModifiers(row);

	return {
		dice_instance_id: row.dice_instance_id,
		loot_id: row.loot_id,
		name: row.name,
		crafted_name: craftedName,
		stat_description: row.stat_description,
		lore: row.lore,
		rarity: row.rarity || 'Common',
		drop_rarity_score: Number(row.drop_rarity_score) || 100,
		image_key: row.image_key,
		quantity: 1,
		item_level: Number(row.item_level) || 1,
		socket_count: Number(row.socket_count) || 0,
		implicits,
		modifiers: essenceModifiers,
		sockets,
		stats: effectiveStats,
		effective_stats: buildEffectiveStatRows(effectiveStats, playerBonuses),
	};
}

function buildDiceGearPayload(item, gear) {
	return {
		dice_instance_id: item.id || item.dice_instance_id,
		loot_id: item.loot_id,
		name: item.name,
		stat_description: item.stat_description,
		lore: item.lore,
		rarity: item.rarity || 'Common',
		drop_rarity_score: Number(item.drop_rarity_score) || 100,
		image_key: gear.image_key,
		side_1: gear.side_1,
		side_2: gear.side_2,
		side_3: gear.side_3,
		side_4: gear.side_4,
		side_5: gear.side_5,
		side_6: gear.side_6,
		no_of_rolls: gear.no_of_rolls,
		duplication_chance: gear.duplication_chance,
		duplication_number: gear.duplication_number,
		crit_chance: gear.crit_chance,
		crit_power: gear.crit_power,
		base_flat_damage: gear.flat_damage,
		item_level: item.item_level || 1,
		socket_count: item.socket_count || 0,
	};
}

function loadFormattedDiceInstance(userId, diceInstanceId, callback) {
	userDiceModel.selectById({ userId, diceInstanceId }, (diceError, diceRows) => {
		if (diceError) return callback(diceError);

		const item = diceRows[0];
		if (!item?.loot_id) {
			return callback(null, null);
		}

		diceGearModel.selectByLootId({ lootId: item.loot_id }, (gearError, gearRows) => {
			if (gearError) return callback(gearError);

			const gear = gearRows[0];
			if (!gear) {
				return callback(null, null);
			}

			diceCraftService.loadModifiers(userId, diceInstanceId, (modifierError, modifiers) => {
				if (modifierError) return callback(modifierError);

				diceCraftService.loadSockets(userId, diceInstanceId, (socketError, sockets) => {
					if (socketError) return callback(socketError);

					callback(
						null,
						formatEquippedDice(buildDiceGearPayload(item, gear), modifiers, sockets)
					);
				});
			});
		});
	});
}

function loadEquippedDice(userId, callback) {
	diceGearModel.selectEquippedForUser({ userId }, (error, results) => {
		if (error) return callback(error);

		const equippedRow = results[0];
		if (!equippedRow?.loot_id || !equippedRow?.dice_instance_id) {
			return callback(null, null);
		}

		diceCraftService.loadModifiers(userId, equippedRow.dice_instance_id, (modifierError, modifiers) => {
			if (modifierError) return callback(modifierError);

			diceCraftService.loadSockets(userId, equippedRow.dice_instance_id, (socketError, sockets) => {
				if (socketError) return callback(socketError);
				callback(null, formatEquippedDice(equippedRow, modifiers, sockets));
			});
		});
	});
}

module.exports.getInventoryById = (req, res, next) => {
	const userId = res.locals.userId;
	let loadError = null;
	let consumables = [];
	let diceRows = [];
	let modifierRows = [];
	let socketRows = [];
	let equippedRow = null;
	let pending = 5;

	const done = () => {
		pending -= 1;
		if (pending > 0) return;

		if (loadError) {
			console.error('Error getInventoryById:', loadError);
			return res.status(500).json(loadError);
		}

		const modifiersByDie = new Map();
		(modifierRows || []).forEach((row) => {
			const formatted = formatModifierRow(row);
			if (!isEssenceAffixModifier(formatted)) return;
			const list = modifiersByDie.get(formatted.dice_instance_id) || [];
			list.push(formatted);
			modifiersByDie.set(formatted.dice_instance_id, list);
		});

		const socketsByDie = new Map();
		(socketRows || []).forEach((row) => {
			const formatted = formatSocketRow(row);
			const list = socketsByDie.get(formatted.dice_instance_id) || [];
			list.push(formatted);
			socketsByDie.set(formatted.dice_instance_id, list);
		});

		const equippedDice =
			equippedRow?.loot_id && equippedRow?.dice_instance_id
				? formatEquippedDice(
						equippedRow,
						modifiersByDie.get(equippedRow.dice_instance_id) || [],
						socketsByDie.get(equippedRow.dice_instance_id) || []
					)
				: null;

		const diceInventory = (diceRows || []).map((row) =>
			formatUserDiceInventoryRow(
				row,
				modifiersByDie.get(row.id) || [],
				socketsByDie.get(row.id) || []
			)
		);

		res.locals.inventory = [...diceInventory, ...(consumables || [])];
		res.locals.equippedDice = equippedDice;
		res.locals.diceModifiers = equippedDice?.modifiers || [];
		res.locals.is_admin =
			res.locals.is_admin ?? ['admin', 'god'].includes(res.locals.user_data?.[0]?.account_role);
		next();
	};

	inventoryModel.selectInventoryById({ userId }, (error, results) => {
		if (error) loadError = error;
		consumables = results || [];
		done();
	});

	userDiceModel.selectByUserId({ userId }, (error, results) => {
		if (error) loadError = error;
		diceRows = results || [];
		done();
	});

	diceModifierModel.selectAllByUserId({ userId }, (error, results) => {
		if (error) loadError = error;
		modifierRows = results || [];
		done();
	});

	diceSocketModel.selectAllByUserId({ userId }, (error, results) => {
		if (error) loadError = error;
		socketRows = results || [];
		done();
	});

	diceGearModel.selectEquippedForUser({ userId }, (error, results) => {
		if (error) loadError = error;
		equippedRow = results?.[0] || null;
		done();
	});
};

module.exports.useItemInInventory = (req, res, next) => {
	const data = {
		userId: res.locals.userId,
		lootId: req.params.lootId,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error useItemInInventory:', error);
			res.status(500).json(error);
		} else if (results.length === 0) {
			res.status(404).json({ message: 'Failed to use item' });
		} else if (results[0].user_id !== res.locals.userId) {
			res.status(403).json({ message: 'User does not own item' });
		} else if (results[0].quantity <= 0) {
			res.status(404).json({ message: `You have no more ${results[0].name}` });
		} else if (results[0].mechanic === 'equip_dice') {
			res.status(400).json({ message: 'Dice items must be equipped, not used.' });
		} else if (isCraftableMechanic(results[0].mechanic)) {
			res.status(400).json({ message: 'Drag this essence onto your equipped die to craft it.' });
		} else if (isSocketableMechanic(results[0].mechanic)) {
			res.status(400).json({ message: 'Drag this weighting stone onto a die to socket it.' });
		} else if (results[0].craft_cost > res.locals.user_data[0].reputation) {
			res.status(403).json({ message: 'Not enough reputation' });
		} else {
			res.locals.itemName = results[0].name;
			res.locals.statline = results[0].statline;
			res.locals.mechanic = results[0].mechanic;
			res.locals.craft_cost = results[0].craft_cost;
			next();
		}
	};

	inventoryModel.getItemFromInventory(data, callback);
};

module.exports.equipDiceFromInventory = (req, res, next) => {
	const userId = res.locals.userId;
	const diceInstanceId = parseInt(req.params.diceInstanceId, 10);

	if (!Number.isFinite(diceInstanceId)) {
		return res.status(400).json({ message: 'Invalid dice item.' });
	}

	userDiceModel.selectById({ userId, diceInstanceId }, (inventoryError, diceRows) => {
		if (inventoryError) {
			console.error('Error equipDiceFromInventory:', inventoryError);
			return res.status(500).json(inventoryError);
		}

		const item = diceRows[0];
		if (!item) {
			return res.status(404).json({ message: 'Dice not found in inventory.' });
		}

		diceGearModel.selectByLootId({ lootId: item.loot_id }, (gearError, gearRows) => {
			if (gearError) {
				console.error('Error loading dice gear:', gearError);
				return res.status(500).json(gearError);
			}

			const gear = gearRows[0];
			if (!gear) {
				return res.status(404).json({ message: 'Dice configuration not found.' });
			}

			userModel.setEquippedDiceId({ userId, diceInstanceId }, (equipError) => {
				if (equipError) {
					console.error('Error saving equipped dice:', equipError);
					return res.status(500).json(equipError);
				}

				diceCraftService.syncEquippedDiceStats(userId, (syncError) => {
					if (syncError) {
						console.error('Error syncing equipped dice stats:', syncError);
						return res.status(500).json(syncError);
					}

					diceCraftService.loadModifiers(userId, diceInstanceId, (modifierError, modifiers) => {
						if (modifierError) {
							console.error('Error loading equipped dice modifiers:', modifierError);
							return res.status(500).json(modifierError);
						}

						diceCraftService.loadSockets(userId, diceInstanceId, (socketError, sockets) => {
							if (socketError) {
								console.error('Error loading equipped dice sockets:', socketError);
								return res.status(500).json(socketError);
							}

							res.locals.message = `Equipped ${item.name}.`;
							res.locals.equippedDice = formatEquippedDice(
								buildDiceGearPayload({ ...item, dice_instance_id: diceInstanceId }, gear),
								modifiers,
								sockets
							);
							res.locals.diceModifiers = modifiers;
							next();
						});
					});
				});
			});
		});
	});
};

module.exports.grantAdminCraftingKit = (req, res, next) => {
	const userId = res.locals.userId;

	lootModel.selectStackableLoot((lootError, stackableRows) => {
		if (lootError) {
			console.error('Error loading crafting materials:', lootError);
			return res.status(500).json(lootError);
		}

		let materialIndex = 0;

		function grantNextMaterial() {
			if (materialIndex >= stackableRows.length) {
				return grantDiceTypes();
			}

			const row = stackableRows[materialIndex];
			materialIndex += 1;

			lootModel.setInventoryQuantity(
				{ userId, lootId: row.id, quantity: ADMIN_CRAFTING_MATERIAL_QUANTITY },
				(setError) => {
					if (setError) {
						console.error('Error granting crafting material:', setError);
						return res.status(500).json(setError);
					}
					grantNextMaterial();
				}
			);
		}

		function grantDiceTypes() {
			lootModel.selectAdminGrantDiceLoot((diceLootError, diceRows) => {
				if (diceLootError) {
					console.error('Error loading dice loot:', diceLootError);
					return res.status(500).json(diceLootError);
				}

				const grants = [];
				(diceRows || []).forEach((row) => {
					for (let count = 0; count < ADMIN_DICE_GRANT_COUNT; count += 1) {
						grants.push(row);
					}
				});

				let grantIndex = 0;

				function grantNextDie() {
					if (grantIndex >= grants.length) {
						res.locals.message = `Granted ${ADMIN_CRAFTING_MATERIAL_QUANTITY} of each crafting material and ${ADMIN_DICE_GRANT_COUNT} of each die family (top tier).`;
						return next();
					}

					const row = grants[grantIndex];
					grantIndex += 1;
					const playerLevel = Math.max(1, Number(res.locals.user_data?.[0]?.level) || 1);
					const dropRarityScore = 8 + Math.floor(playerLevel * 0.85);

					userDiceModel.addUserDice(
						{
							userId,
							lootId: row.id,
							itemLevel: playerLevel,
							dropRarityScore,
						},
						(addError) => {
						if (addError) {
							console.error('Error granting admin dice:', addError);
							return res.status(500).json(addError);
						}
						grantNextDie();
					});
				}

				grantNextDie();
			});
		}

		grantNextMaterial();
	});
};

module.exports.loadEquippedDice = loadEquippedDice;
module.exports.loadFormattedDiceInstance = loadFormattedDiceInstance;

module.exports.unequipDice = (req, res, next) => {
	const userId = res.locals.userId;

	diceModel.resetToDefault({ userId }, (resetError) => {
		if (resetError) {
			console.error('Error resetting dice:', resetError);
			return res.status(500).json(resetError);
		}

		userModel.clearEquippedDiceId({ userId }, (clearError) => {
			if (clearError) {
				console.error('Error clearing equipped dice:', clearError);
				return res.status(500).json(clearError);
			}

			res.locals.message = 'Unequipped dice. Default dice restored.';
			res.locals.equippedDice = null;
			next();
		});
	});
};
