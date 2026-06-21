const inventoryModel = require('../models/inventoryModel.js');
const lootModel = require('../models/lootModel.js');
const userDiceModel = require('../models/userDiceModel.js');
const diceGearModel = require('../models/diceGearModel.js');
const diceModel = require('../models/diceModel.js');
const userModel = require('../models/userModel.js');
const diceCraftService = require('../services/diceCraftService.js');
const { isCraftableMechanic, isSocketableMechanic } = require('../utils/diceEssenceCraft.js');
const {
	formatCompactDiceItem,
	formatCompactEquippedItem,
	formatCompactStackableItem,
	parseStatsSnapshot,
} = require('../utils/diceItemSnapshot.js');

const ADMIN_CRAFTING_MATERIAL_QUANTITY = 999;
const ADMIN_DICE_GRANT_COUNT = 2;

module.exports.getInventoryById = (req, res, next) => {
	const userId = res.locals.userId;
	let loadError = null;
	let consumables = [];
	let diceRows = [];
	let equippedRow = null;
	let pending = 3;

	const done = () => {
		pending -= 1;
		if (pending > 0) return;

		if (loadError) {
			console.error('Error getInventoryById:', loadError);
			return res.status(500).json(loadError);
		}

		const equippedDice =
			equippedRow?.loot_id && equippedRow?.dice_instance_id
				? formatCompactEquippedItem(equippedRow)
				: null;

		const diceInventory = (diceRows || []).map((row) => formatCompactDiceItem(row));

		res.locals.inventory = [...diceInventory, ...(consumables || []).map(formatCompactStackableItem)];
		res.locals.equippedDice = equippedDice;
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

	diceGearModel.selectEquippedForUser({ userId }, (error, results) => {
		if (error) loadError = error;
		equippedRow = results?.[0] || null;
		done();
	});
};

function formatConsumableInventoryRow(row) {
	if (!row) return null;
	return formatCompactStackableItem(row);
}

module.exports.applyDiceMutationInventory = (req, res, next) => {
	const userId = res.locals.userId;
	const diceInstanceId = res.locals.craftDieRow?.id || res.locals.targetDiceInstanceId;
	const consumableLootId = res.locals.consumableLootId;
	const equippedId = res.locals.user_data?.[0]?.equipped_dice_id;

	if (!diceInstanceId) {
		return res.status(500).json({ message: 'Mutation inventory context missing.' });
	}

	const finishPatch = (snapshot) => {
		userDiceModel.selectById({ userId, diceInstanceId }, (selectError, rows) => {
			if (selectError) {
				console.error('Error loading patched die:', selectError);
				return res.status(500).json(selectError);
			}

			const dieRow = rows[0];
			const snapshotData = snapshot || parseStatsSnapshot(dieRow?.stats_snapshot);
			const formattedDie = formatCompactDiceItem(dieRow, snapshotData);

			const sendPatch = (consumables) => {
				res.locals.inventoryPatch = {
					dice: [formattedDie],
					consumables,
				};

				if (Number(equippedId) === Number(diceInstanceId)) {
					res.locals.equippedDice = formatCompactEquippedItem(dieRow, snapshotData);
				}

				res.locals.is_admin = ['admin', 'god'].includes(res.locals.user_data?.[0]?.account_role);
				next();
			};

			if (!consumableLootId) {
				return sendPatch([]);
			}

			inventoryModel.getItemFromInventory({ userId, lootId: consumableLootId }, (error, itemRows) => {
				if (error) {
					console.error('Error loading consumed item:', error);
					return res.status(500).json(error);
				}

				const consumable = formatConsumableInventoryRow(itemRows[0]);
				sendPatch(consumable ? [consumable] : [{ lid: consumableLootId, q: 0, m: 'item' }]);
			});
		});
	};

	diceCraftService.persistDiceSnapshotAndSync(
		userId,
		diceInstanceId,
		res.locals.user_data,
		(persistError, snapshot) => {
			if (persistError) {
				console.error('Error persisting dice snapshot:', persistError);
				return res.status(500).json(persistError);
			}
			finishPatch(snapshot);
		}
	);
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
		} else {
			res.locals.itemName = results[0].name;
			res.locals.statline = results[0].statline;
			res.locals.mechanic = results[0].mechanic;
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
		if (!item.image_key) {
			return res.status(404).json({ message: 'Dice configuration not found.' });
		}

		userModel.setEquippedDiceId({ userId, diceInstanceId }, (equipError) => {
			if (equipError) {
				console.error('Error saving equipped dice:', equipError);
				return res.status(500).json(equipError);
			}

			if (res.locals.user_data?.[0]) {
				res.locals.user_data[0].equipped_dice_id = diceInstanceId;
			}

			diceCraftService.persistDiceSnapshotAndSync(
				userId,
				diceInstanceId,
				res.locals.user_data,
				(syncError) => {
					if (syncError) {
						console.error('Error syncing equipped dice:', syncError);
						return res.status(500).json(syncError);
					}

					res.locals.message = `Equipped ${item.name}.`;
					next();
				}
			);
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
							instanceRarity: row.rarity || 'Legendary',
							dropRarityScore,
						},
						(addError, addResult) => {
							if (addError) {
								console.error('Error granting admin dice:', addError);
								return res.status(500).json(addError);
							}

							diceCraftService.rebuildAndPersistDiceSnapshot(
								userId,
								addResult.insertId,
								(rebuildError) => {
									if (rebuildError) {
										console.error('Error snapshot for granted die:', rebuildError);
										return res.status(500).json(rebuildError);
									}
									grantNextDie();
								}
							);
						}
					);
				}

				grantNextDie();
			});
		}

		grantNextMaterial();
	});
};

module.exports.loadEquippedDice = (userId, callback) => {
	diceGearModel.selectEquippedForUser({ userId }, (error, results) => {
		if (error) return callback(error);
		const equippedRow = results[0];
		if (!equippedRow?.loot_id || !equippedRow?.dice_instance_id) {
			return callback(null, null);
		}
		callback(null, formatCompactEquippedItem(equippedRow));
	});
};

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

			if (res.locals.user_data?.[0]) {
				res.locals.user_data[0].equipped_dice_id = null;
			}

			res.locals.message = 'Unequipped dice. Default dice restored.';
			res.locals.equippedDice = null;
			next();
		});
	});
};
