const model = require('../models/lootModel.js');
const mechanicMap = require('../utils/mechanicMap.js');
const { bulkRollLoot, insertCallback } = require('../middleware/lootConfigs.js');

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
