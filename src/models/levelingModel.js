const pool = require('../services/db');

// Deduct reputation cost from user
module.exports.removeRepUsed = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE user
        SET reputation = reputation - ?
        WHERE id = ?;
    `;
	const VALUES = [data.cost, data.userId];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Increase user level and scale up level-up cost
module.exports.incrementLevel = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE user
        SET level = level + 1,  level_up_cost = FLOOR(level_up_cost + LOG(level + 1) * 50), rep_multi = ROUND(1.0 + POW(level, 1.2) / 25, 4)
        WHERE id = ?;
    `;
	const VALUES = [data.userId];
	pool.query(SQLSTATMENT, VALUES, callback);
};

module.exports.updateLevelAndExperience = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE user
        SET level = ?,
            experience = ?,
            rep_multi = ROUND(1.0 + POW(?, 1.2) / 25, 4)
        WHERE id = ?;
    `;
	const VALUES = [data.level, data.experience, data.level, data.userId];
	pool.query(SQLSTATMENT, VALUES, callback);
};
