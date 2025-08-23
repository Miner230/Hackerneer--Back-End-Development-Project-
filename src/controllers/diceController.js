const model = require('../models/diceModel.js');
const { diceRoll } = require('../middleware/diceCalculator.js');

// Create a new dice record for the user
module.exports.createNewDice = (req, res, next) => {
	const data = {
		id: res.locals.insertId || res.locals.userId,
	};

	const callback = (error) => {
		if (error) {
			console.error('Error createNewDice:', error);
			res.status(500).json(error);
		} else {
			next();
		}
	};

	model.addDice(data, callback);
};

// Read dice values for a specific user
module.exports.readDiceByUserId = (req, res, next) => {
	const data = {
		id: req.params.userId || res.locals.userId,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error readDiceByUserId:', error);
			res.status(500).json(error);
		} else if (results.length === 0) {
			res.status(404).json({ message: 'Dice not found' });
		} else {
			res.locals.rows = results[0];
			next();
		}
	};

	model.selectDiceByUserId(data, callback);
};

// Perform a dice roll for the user
module.exports.rollDice = (req, res, next) => {
	const data = { id: req.params.userId };

	const callback = () => {
		const row = res.locals.rows; // Must be set by readDiceByUserId
		if (!row) {
			return res.status(400).json({ message: 'Dice data missing from row' });
		}

		const rolled = diceRoll(row);
		if (!rolled) {
			return res.status(500).json({ message: 'Dice roll failed' });
		}

		Object.assign(res.locals, rolled);
		next();
	};

	model.selectDiceByUserId(data, callback);
};
