const inventoryModel = require('../models/inventoryModel.js');
const userDiceModel = require('../models/userDiceModel.js');
const lootModel = require('../models/lootModel.js');
const diceSocketModel = require('../models/diceSocketModel.js');
const diceCraftService = require('../services/diceCraftService.js');
const { loadEquippedDice, loadFormattedDiceInstance } = require('./inventoryController.js');
const { isSocketableMechanic } = require('../utils/diceSockets.js');

module.exports.socketItemOntoDice = (req, res, next) => {
	const userId = res.locals.userId;
	const lootId = parseInt(req.body?.lootId, 10);
	const diceInstanceId = parseInt(req.body?.diceInstanceId, 10);

	if (!Number.isFinite(lootId)) {
		return res.status(400).json({ message: 'Invalid weighting stone.' });
	}
	if (!Number.isFinite(diceInstanceId)) {
		return res.status(400).json({ message: 'Invalid target die.' });
	}

	userDiceModel.selectById({ userId, diceInstanceId }, (diceError, diceRows) => {
		if (diceError) {
			console.error('Error loading target die for socket:', diceError);
			return res.status(500).json(diceError);
		}

		const die = diceRows[0];
		if (!die) {
			return res.status(404).json({ message: 'Target die not found in your inventory.' });
		}

		const socketCount = Math.max(0, Number(die.socket_count) || 0);
		if (socketCount <= 0) {
			return res.status(409).json({ message: 'This die has no sockets.' });
		}

		inventoryModel.getItemFromInventory({ userId, lootId }, (itemError, itemRows) => {
			if (itemError) {
				console.error('Error loading socket item:', itemError);
				return res.status(500).json(itemError);
			}

			const item = itemRows[0];
			if (!item) {
				return res.status(404).json({ message: 'Weighting stone not found in inventory.' });
			}
			if (item.quantity <= 0) {
				return res.status(404).json({ message: `You have no more ${item.name}.` });
			}
			if (!isSocketableMechanic(item.mechanic)) {
				return res.status(400).json({ message: 'This item cannot be socketed into dice.' });
			}
			if (item.craft_cost > res.locals.user_data[0].reputation) {
				return res.status(403).json({ message: 'Not enough reputation to socket this stone.' });
			}

			diceSocketModel.countByDiceInstanceId({ userId, diceInstanceId }, (countError, countRows) => {
				if (countError) {
					console.error('Error counting die sockets:', countError);
					return res.status(500).json(countError);
				}

				const usedSockets = Number(countRows[0]?.count || 0);
				if (usedSockets >= socketCount) {
					return res.status(409).json({
						message: `This die has no open sockets (${usedSockets}/${socketCount} filled).`,
					});
				}

				const rolledValue = Math.max(1, Number(item.statline) || 1);

				diceSocketModel.insertSocketItem(
					{
						userId,
						diceInstanceId,
						slotIndex: usedSockets,
						mechanic: item.mechanic,
						rolledValue,
						sourceLootId: lootId,
						sourceRarity: item.rarity,
					},
					(insertError) => {
						if (insertError) {
							console.error('Error inserting socket item:', insertError);
							return res.status(500).json(insertError);
						}

						lootModel.decrementQnt({ userId, lootId }, (decrementError, decrementResult) => {
							if (decrementError) {
								console.error('Error consuming socket item:', decrementError);
								return res.status(500).json(decrementError);
							}
							if (!decrementResult?.affectedRows) {
								return res.status(404).json({ message: 'Failed to consume weighting stone.' });
							}

							res.locals.craft_cost = item.craft_cost;
							res.locals.itemName = item.name;
							res.locals.targetDiceInstanceId = diceInstanceId;
							res.locals.socketedItem = {
								mechanic: item.mechanic,
								rolled_value: rolledValue,
								source_loot_id: lootId,
								source_rarity: item.rarity,
								source_name: item.name,
							};

							next();
						});
					}
				);
			});
		});
	});
};

module.exports.finalizeSocket = (req, res, next) => {
	const userId = res.locals.userId;
	const diceInstanceId = res.locals.targetDiceInstanceId;

	diceCraftService.syncDiceStatsIfEquipped(userId, diceInstanceId, (syncError) => {
		if (syncError) {
			console.error('Error syncing socketed die stats:', syncError);
			return res.status(500).json(syncError);
		}

		diceCraftService.loadSockets(userId, diceInstanceId, (socketError, sockets) => {
			if (socketError) {
				console.error('Error loading socketed items:', socketError);
				return res.status(500).json(socketError);
			}

			diceCraftService.loadEquippedDiceInstanceId(userId, (equippedError, equippedDiceId) => {
				if (equippedError) {
					console.error('Error loading equipped die id after socket:', equippedError);
					return res.status(500).json(equippedError);
				}

				const loadPanelDice = (callback) => {
					if (equippedDiceId === diceInstanceId) {
						return loadFormattedDiceInstance(userId, diceInstanceId, callback);
					}
					return loadEquippedDice(userId, callback);
				};

				loadPanelDice((panelError, equippedDice) => {
					if (panelError) {
						console.error('Error loading equipped die after socket:', panelError);
						return res.status(500).json(panelError);
					}

					const socketed = res.locals.socketedItem;
					res.locals.message = `Socketed ${socketed.source_name} (+${socketed.rolled_value}) into your die.`;
					res.locals.diceSockets = sockets;
					res.locals.equippedDice = equippedDice;
					next();
				});
			});
		});
	});
};
