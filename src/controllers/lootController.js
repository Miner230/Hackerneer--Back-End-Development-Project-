const model = require('../models/lootModel.js');
const userDiceModel = require('../models/userDiceModel.js');
const diceCraftService = require('../services/diceCraftService.js');
const diceGearModel = require('../models/diceGearModel.js');
const mechanicMap = require('../utils/mechanicMap.js');
const { rollDiceItemLevel } = require('../utils/diceItemLevel.js');
const {
	monsterItemRarityToDiceTier,
	getModifierCountForDiceRarity,
	rollDropModifiers,
	resolveDiceLootId,
} = require('../utils/diceDropModifiers.js');
const { bulkRollLoot, insertCallback, rollMonsterLoot } = require('../middleware/lootConfigs.js');

// Get all loot items
module.exports.getAllLoot = (req, res, next) => {
	const callback = (error, results) => {
	if (error) {
			console.error('Error getAllLoot:', error);
			res.status(500).json(error);
		} else {
			res.locals.lootRows = results;
			next();
		}
	};
	model.selectAllLoot(callback);
};

// Add rolled loot to user inventory
module.exports.addLootToInventory = (req, res, next) => {
	const user_data = res.locals.user_data;
	const lootRows = res.locals.lootRows;
	const userId = res.locals.userId;
	const amount = parseInt(req.params.amount);

	if (isNaN(amount) || amount <= 0) {
		return res.status(400).json({ message: 'You must claim at least one loot shard.' });
	}

	const bulkResult = bulkRollLoot(user_data, lootRows, amount);
	if (bulkResult.error) {
		return res.status(409).json({ message: bulkResult.error });
	}

	const claimed = bulkResult.claimed;
	const inserted = [];

	function insertNext(index) {
		// Finish after last insert
		if (index >= claimed.length) {
			res.locals.message = `You claimed ${amount} item(s) successfully!`;
			res.locals.claimed = inserted;
			return next();
		}

		const item = claimed[index];
		const data = { userId, lootId: item.id, quantity: item.quantity };

		model.addLoot(data, (error, result, fields) => {
			insertCallback({
				error,
				result,
				fields,
				claimed,
				index,
				inserted,
				res,
				next,
				amount,
				insertNext,
			});
		});
	}

	insertNext(0);
};

// Grant rolled loot when a monster is defeated in delve combat.
module.exports.grantMonsterDrops = (req, res, next) => {
	const formatted = res.locals.formattedDelve;
	const allDead = formatted?.all_enemies_dead || Number(formatted?.health) <= 0;
	if (!formatted || !allDead) {
		return next();
	}

	const lootRows = res.locals.lootRows;
	const rollResult = rollMonsterLoot(lootRows, formatted.item_quantity, formatted.item_rarity);

	if (rollResult.error) {
		return res.status(500).json({ message: rollResult.error });
	}

	const dropped = rollResult.items || [];

	if (dropped.length === 0) {
		res.locals.droppedLoot = [];
		return next();
	}

	const userId = res.locals.userId;
	const inserted = [];
	const lootById = new Map((lootRows || []).map((row) => [row.id, row]));

	function expandDrops(items) {
		const expanded = [];

		items.forEach((item) => {
			const lootMeta = lootById.get(item.id);
			const mechanic = item.mechanic || lootMeta?.mechanic;
			const quantity = Math.max(1, Number(item.quantity) || 1);

			if (mechanic === 'equip_dice') {
				for (let i = 0; i < quantity; i += 1) {
					expanded.push({
						...item,
						mechanic,
						quantity: 1,
					});
				}
				return;
			}

			expanded.push({ ...item, mechanic });
		});

		return expanded;
	}

	const expandedDrops = expandDrops(dropped);

	function enrichDrop(item, callback) {
		const isEquipDice =
			item.mechanic === 'equip_dice' || item.dice_instance_id != null;

		if (!isEquipDice) {
			return callback(null, item);
		}

		diceGearModel.selectByLootId({ lootId: item.id }, (error, rows) => {
			if (error) return callback(error);
			const gear = rows[0];
			callback(null, {
				...item,
				image_key: gear?.image_key || 'dice1',
			});
		});
	}

	function grantDrop(item, callback) {
		if (item.mechanic === 'equip_dice') {
			const itemLevel = rollDiceItemLevel(formatted.level);
			const instanceRarity = monsterItemRarityToDiceTier(formatted.item_rarity);
			const modifierCount = getModifierCountForDiceRarity(instanceRarity);
			const dropModifiers = rollDropModifiers(modifierCount, lootRows);
			const familyName = item.familyName || item.name;
			const rolledMeta = lootById.get(item.id);
			let lootId = resolveDiceLootId(lootRows, familyName, instanceRarity);

			if (
				!lootId &&
				rolledMeta?.mechanic === 'equip_dice' &&
				rolledMeta.name === familyName
			) {
				lootId = item.id;
			}

			if (!lootId) {
				return callback(new Error(`No loot row for ${familyName} (${instanceRarity}).`));
			}

			return userDiceModel.addUserDice(
				{
					userId,
					lootId,
					itemLevel,
					instanceRarity,
					dropRarityScore: formatted.item_rarity,
				},
				(error, result) => {
					if (error) return callback(error);

					diceCraftService.applyDropModifiers(
						userId,
						result.insertId,
						dropModifiers,
						(modError) => {
							if (modError) return callback(modError);

							userDiceModel.selectById(
								{ userId, diceInstanceId: result.insertId },
								(selectError, diceRows) => {
									if (selectError) return callback(selectError);
									const diceRow = diceRows[0];
									callback(null, {
										id: lootId,
										name: familyName,
										rarity: diceRow.instance_rarity || instanceRarity,
										mechanic: 'equip_dice',
										dice_instance_id: result.insertId,
										item_level: itemLevel,
										socket_count: Number(diceRow?.socket_count) || 0,
										modifier_count: dropModifiers.length,
									});
								}
							);
						}
					);
				}
			);
		}

		return model.addLoot({ userId, lootId: item.id, quantity: item.quantity }, (error) => {
			if (error) return callback(error);
			callback(null, item);
		});
	}

	function insertNext(index) {
		if (index >= expandedDrops.length) {
			res.locals.droppedLoot = inserted;
			return next();
		}

		const item = expandedDrops[index];

		grantDrop(item, (grantError, grantedItem) => {
			if (grantError) {
				console.error('Error granting monster loot:', grantError);
				return res.status(500).json(grantError);
			}

			enrichDrop(grantedItem, (enrichError, enriched) => {
				if (enrichError) {
					console.error('Error enriching monster loot:', enrichError);
					return res.status(500).json(enrichError);
				}

				inserted.push({
					id: enriched.id,
					dice_instance_id: enriched.dice_instance_id,
					name: enriched.name,
					rarity: enriched.rarity,
					quantity: 1,
					mechanic: enriched.mechanic,
					image_key: enriched.image_key,
					item_level: enriched.item_level,
					socket_count: enriched.socket_count,
				});
				insertNext(index + 1);
			});
		});
	}

	insertNext(0);
};

// Apply loot mechanics to user stats
module.exports.handleMechanics = (req, res, next) => {
	const itemMechanic = res.locals.mechanic;
	const itemStatline = res.locals.statline;
	const userId = res.locals.userId;
	const config = mechanicMap[itemMechanic];

	if (!config) {
		return res.status(400).json({ message: `Invalid mechanic: ${itemMechanic}` });
	}

	// Payload for mechanic-specific update
	const data = {
		table: config.table,
		userId,
		stat: itemStatline,
		row: config.row,
		indexName: config.indexName,
	};

	const callback = (error) => {
		if (error) {
			console.error('Error handleMechanics:', error);
			res.status(500).json(error);
		} else {
			next();
		}
	};

	model.modifyByMechanics(data, callback);
};

// Decrement quantity of a specific loot item
module.exports.removeQnt = (req, res, next) => {
	const data = {
		userId: res.locals.userId,
		lootId: req.params.lootId,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error removeQnt:', error);
			return res.status(500).json(error);
		}
		if (results.affectedRows == 0) {
			return res.status(404).json({
				message: `You dont have enough ${res.locals.itemName}`,
			});
		}
		// mechanic name for message
		res.locals.message = `Used ${res.locals.itemName} to increase ${res.locals.mechanic.replace(/_/g, ' ')} by ${res.locals.statline}`;
		next();
	};

	model.decrementQnt(data, callback);
};
