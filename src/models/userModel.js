const pool = require('../services/db');

// Get all users
module.exports.selectAll = (callback) => {
	const SQLSTATMENT = `
        SELECT * FROM user;
    `;
	pool.query(SQLSTATMENT, callback);
};

// Add a new user
module.exports.addUser = (data, callback) => {
	const SQLSTATMENT = `
        INSERT INTO user (username, password)
        VALUES (?, ?);
    `;
	const VALUES = [data.username, data.password];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Display newly added user by ID
module.exports.displayAddedUser = (data, callback) => {
	const SQLSTATMENT = `
        SELECT * FROM user WHERE id = ?;
    `;
	const VALUES = data;
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Check if a username already exists
module.exports.checkUsername = (data, callback) => {
	const SQLSTATMENT = `
        SELECT COUNT(*) AS count FROM user WHERE username = ?;
    `;
	const VALUES = [data.username];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Get a user by ID
module.exports.selectUserById = (data, callback) => {
	const SQLSTATMENT = `
        SELECT * FROM user
        WHERE id = ?;
    `;
	const VALUES = [data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Gets lightweight user fields used by crafting/socket routes.
module.exports.selectCraftContext = (data, callback) => {
	const SQLSTATMENT = `
        SELECT id, account_role, equipped_dice_id
        FROM user
        WHERE id = ?;
    `;
	pool.query(SQLSTATMENT, [data.id], callback);
};

// Gets information from the database about the user without providing sensitive values
module.exports.selectUserByIdSecure = (data, callback) => {
	const SQLSTATMENT = `
        SELECT id, username, account_role, level, experience, level_up_cost, loot_shard, number_of_delve_completed, voidstone_count,
               player_flat_health, player_max_health_percent, damage_reduction_penetration, player_life_regen, player_speed_bonus,
               equipped_dice_id
        FROM user
        WHERE id = ?;
    `;
	const VALUES = [data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// gets the id, username and password from user where username provides a specfic value
module.exports.selectByUsername = (data, callback) => {
	const SQLSTATMENT = `
        SELECT id, username, password FROM user
        WHERE username = ?
    `;

	const VALUES = [data.username];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Increment completed delves after a victory
module.exports.incrementUserStats = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE user
        SET number_of_delve_completed = number_of_delve_completed + 1
        WHERE id = ?;
    `;
	const VALUES = [data.userId];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Deduct 1 loot shard from user
module.exports.decrementLootShard = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE user
        SET loot_shard = loot_shard - ?
        WHERE id = ?;
    `;
	const VALUES = [data.amount, data.userId];
	pool.query(SQLSTATMENT, VALUES, callback);
};

module.exports.selectLeaderboard = (callback) => {
	const SQLSTATMENT = `
    SELECT username, level, number_of_delve_completed
    FROM user 
    ORDER BY level DESC, number_of_delve_completed DESC
    LIMIT 10;
    `;
	pool.query(SQLSTATMENT, callback);
};

module.exports.setEquippedDiceId = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE user
        SET equipped_dice_id = ?
        WHERE id = ?;
    `;
	pool.query(SQLSTATMENT, [data.diceInstanceId, data.userId], callback);
};

module.exports.clearEquippedDiceId = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE user
        SET equipped_dice_id = NULL
        WHERE id = ?;
    `;
	pool.query(SQLSTATMENT, [data.userId], callback);
};
