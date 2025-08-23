const model = require('../models/levelingModel.js');

// Check if user has enough reputation to level up
module.exports.readLevelCost = (req, res, next) => {
	const reputation = res.locals.user_data[0].reputation;
	const cost = res.locals.user_data[0].level_up_cost;

	if (reputation < cost) {
		return res.status(403).json({ message: 'Not enough reputation!' });
	}

	res.locals.repCost = cost;
	next();
};

// Remove reputation for a level-up
module.exports.removeRep = (req, res, next) => {
	const data = {
		userId: res.locals.userId,
		cost: res.locals.repCost
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error removeRep:', error);
			res.status(500).json(error);
		} else if (results.affectedRows === 0) {
			res.status(404).json({ message: 'Reputation removal failed' });
		} else {
			next();
		}
	};
	model.removeRepUsed(data, callback);
};

// Increment user's level
module.exports.incrementUserLevel = (req, res, next) => {
	const data = {
		userId: res.locals.user_data[0].id,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error incrementLevel:', error);
			res.status(500).json(error);
		} else if (results.affectedRows === 0) {
			res.status(404).json({ message: 'Could not increment level' });
		} else {
			res.locals.message = `User has leveled up to ${res.locals.user_data[0].level + 1}`;
			next();
		}
	};
	model.incrementLevel(data, callback);
};
