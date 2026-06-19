const model = require('../models/levelingModel.js');

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
