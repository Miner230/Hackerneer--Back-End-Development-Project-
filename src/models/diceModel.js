const pool = require('../services/db');

const DEFAULT_DICE_STATS = {
	side_1: 10,
	side_2: 10,
	side_3: 10,
	side_4: 10,
	side_5: 10,
	side_6: 10,
	no_of_rolls: 5,
	duplication_chance: 5,
	duplication_number: 1,
	crit_chance: 10,
	crit_power: 200,
	flat_damage: 0,
	flat_damage_min: 0,
	flat_damage_max: 0,
	flat_damage_percent: 0,
	flat_damage_roll_min: 0,
	flat_damage_roll_max: 0,
};

module.exports.DEFAULT_DICE_STATS = DEFAULT_DICE_STATS;

// Add default dice for a new user
module.exports.addDice = (data, callback) => {
	const SQLSTATMENT = `
        INSERT INTO dice (user_id, side_1, side_2, side_3, side_4, side_5, side_6) 
        VALUES (?, 10, 10, 10, 10, 10, 10);
    `;
	const VALUES = [data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Get dice details and user level by user ID
module.exports.selectDiceByUserId = (data, callback) => {
	const SQLSTATMENT = `
        SELECT dice.*, user.level
        FROM dice
        INNER JOIN user ON dice.user_id = user.id
        WHERE dice.user_id = ?;
    `;
	const VALUES = [data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

module.exports.applyGearStats = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE dice
        SET side_1 = ?, side_2 = ?, side_3 = ?, side_4 = ?, side_5 = ?, side_6 = ?,
            no_of_rolls = ?, duplication_chance = ?, duplication_number = ?,
            crit_chance = ?, crit_power = ?, flat_damage = ?,
            flat_damage_min = ?, flat_damage_max = ?,
            flat_damage_percent = ?, flat_damage_roll_min = ?, flat_damage_roll_max = ?
        WHERE user_id = ?;
    `;
	const VALUES = [
		data.side_1,
		data.side_2,
		data.side_3,
		data.side_4,
		data.side_5,
		data.side_6,
		data.no_of_rolls,
		data.duplication_chance,
		data.duplication_number,
		data.crit_chance,
		data.crit_power,
		data.flat_damage ?? data.flat_damage_max ?? 0,
		data.flat_damage_min ?? 0,
		data.flat_damage_max ?? data.flat_damage ?? 0,
		data.flat_damage_percent ?? 0,
		data.flat_damage_roll_min ?? 0,
		data.flat_damage_roll_max ?? 0,
		data.userId,
	];
	pool.query(SQLSTATMENT, VALUES, callback);
};

module.exports.resetToDefault = (data, callback) => {
	module.exports.applyGearStats({ ...DEFAULT_DICE_STATS, userId: data.userId }, callback);
};
