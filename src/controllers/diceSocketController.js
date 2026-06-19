const inventoryModel = require('../models/inventoryModel.js');
const userDiceModel = require('../models/userDiceModel.js');
const lootModel = require('../models/lootModel.js');
const diceSocketModel = require('../models/diceSocketModel.js');
const diceCraftService = require('../services/diceCraftService.js');
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

	let loadError = null;
	let die = null;
	let item = null;
	let pending = 2;

	const afterLoad = () => {
		pending -= 1;
		if (pending > 0) return;

		if (loadError) {
			console.error('Error loading socket inputs:', loadError);
			return res.status(500).json(loadError);
		}
		if (!die) {
			return res.status(404).json({ message: 'Target die not found in your inventory.' });
		}

		const socketCount = Math.max(0, Number(die.socket_count) || 0);
		if (socketCount <= 0) {
			return res.status(409).json({ message: 'This die has no sockets.' });
		}

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

		const usedSockets = Number(die.used_socket_count) || 0;
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
	};

	userDiceModel.selectById({ userId, diceInstanceId }, (diceError, diceRows) => {
		if (diceError) loadError = diceError;
		else die = diceRows[0] || null;
		afterLoad();
	});

	inventoryModel.getItemFromInventory({ userId, lootId }, (itemError, itemRows) => {
		if (itemError) loadError = itemError;
		else item = itemRows[0] || null;
		afterLoad();
	});
};

module.exports.finalizeSocket = (req, res, next) => {
	const userId = res.locals.userId;
	const diceInstanceId = res.locals.targetDiceInstanceId;

	diceCraftService.syncDiceStatsIfEquipped(
		userId,
		diceInstanceId,
		res.locals.user_data,
		(syncError) => {
			if (syncError) {
				console.error('Error syncing socketed die stats:', syncError);
				return res.status(500).json(syncError);
			}

			const socketed = res.locals.socketedItem;
			res.locals.message = `Socketed ${socketed.source_name} (+${socketed.rolled_value}) into your die.`;
			next();
		}
	);
};
