const model = require('../models/diceModel.js');
const lootModel = require('../models/lootModel.js');
const userDiceModel = require('../models/userDiceModel.js');
const diceGearModel = require('../models/diceGearModel.js');
const userModel = require('../models/userModel.js');
const diceCraftService = require('../services/diceCraftService.js');
const { diceRoll } = require('../middleware/diceCalculator.js');

const STARTER_DICE_NAME = 'Basic Die';

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

// Grant and equip the starter die for new accounts
module.exports.grantStarterDice = (req, res, next) => {
	const userId = res.locals.userId;

	lootModel.selectLootIdByName({ name: STARTER_DICE_NAME, rarity: 'Common' }, (lootError, lootRows) => {
		if (lootError) {
			console.error('Error grantStarterDice lookup:', lootError);
			return res.status(500).json(lootError);
		}

		const lootId = lootRows[0]?.id;
		if (!lootId) {
			console.warn(`Starter dice "${STARTER_DICE_NAME}" not found; skipping grant.`);
			return next();
		}

		userDiceModel.addUserDice(
			{
				userId,
				lootId,
				itemLevel: 1,
				instanceRarity: 'Common',
				dropRarityScore: 8,
				socketCount: 1,
			},
			(diceError, diceResult) => {
			if (diceError) {
				console.error('Error creating starter dice instance:', diceError);
				return res.status(500).json(diceError);
			}

			const diceInstanceId = diceResult.insertId;

			diceGearModel.selectByLootId({ lootId }, (gearError, gearRows) => {
				if (gearError) {
					console.error('Error loading starter dice gear:', gearError);
					return res.status(500).json(gearError);
				}

				const gear = gearRows[0];
				if (!gear) {
					return next();
				}

				userModel.setEquippedDiceId({ userId, diceInstanceId }, (equipError) => {
					if (equipError) {
						console.error('Error saving starter equipped dice:', equipError);
						return res.status(500).json(equipError);
					}

					diceCraftService.persistDiceSnapshotAndSync(
						userId,
						diceInstanceId,
						null,
						(syncError) => {
							if (syncError) {
								console.error('Error syncing starter dice stats:', syncError);
								return res.status(500).json(syncError);
							}

							next();
						}
					);
				});
			});
		});
	});
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

// Perform a dice roll for the user (uses dice row loaded by readDiceByUserId)
module.exports.rollDice = (req, res, next) => {
	const row = res.locals.rows;
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
