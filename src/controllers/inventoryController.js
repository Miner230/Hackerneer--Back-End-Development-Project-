const model = require('../models/inventoryModel.js');

// Get a user's inventory
module.exports.getInventoryById = (req, res, next) => {
	const data = { userId: res.locals.userId };

	const callback = (error, results) => {
		if (error) {
			console.error('Error getInventoryById:', error);
			res.status(500).json(error);
		} else if (results.length === 0) {
			res.status(404).json({ message: 'Inventory is empty' });
		} else {
			res.locals.inventory = results;
			next();
		}
	};

	model.selectInventoryById(data, callback);
};

// Validate and prepare item usage
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
		} else if (results[0].qnt <= 0) {
			res.status(404).json({ message: `You have no more ${results[0].name}` });
		} else if (results[0].craft_cost > res.locals.user_data[0].reputation) {
			res.status(403).json({ message: 'Not enough reputation' });
		} else {
			// Store details for mechanic handling middleware
			res.locals.itemName = results[0].name;
			res.locals.statline = results[0].statline;
			res.locals.mechanic = results[0].mechanic;
			res.locals.craft_cost = results[0].craft_cost;
			next();
		}
	};

	model.getItemFromInventory(data, callback);
};
