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

// Gets information from the database about the user without providing sensitive values
module.exports.selectUserByIdSecure = (data, callback) => {
	const SQLSTATMENT = `
        SELECT id, username, level, level_up_cost, loot_shard, number_of_delve_completed, reputation, rep_multi, voidstone_count FROM user
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

// Update username and reputation for a user
module.exports.updateUserById = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE user 
        SET username = ?, reputation = ?
        WHERE id = ?;
    `;
	const VALUES = [data.username, data.reputation, data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Add reputation based on vulnerability points
module.exports.updateUserRep = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE user
        SET reputation = reputation + (
            SELECT points FROM vulnerability WHERE id = ?
        )*?
        WHERE id = ?;
    `;
	const VALUES = [data.vulId, data.multi, data.userId];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Increment completed delves and add loot shards
module.exports.incrementUserStats = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE user
        SET number_of_delve_completed = number_of_delve_completed + 1, loot_shard = loot_shard + ?
        WHERE id = ?;
    `;
	const VALUES = [data.loot_shard_count, data.userId];
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

// Deduct reputation from user
module.exports.removeRep = (data, callback) => {
	const SQLSTATMENT = `
		UPDATE user
		SET reputation = reputation - ?
		WHERE id = ?
	`;
	const VALUES = [data.usedRep, data.userId, data.usedRep];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Deduct reputation from user
module.exports.selectLeaderboard = (callback) => {
	const SQLSTATMENT = `
    SELECT username, level, reputation 
    FROM user 
    ORDER BY level DESC
    LIMIT 10;
    `;
	pool.query(SQLSTATMENT, callback);
};
