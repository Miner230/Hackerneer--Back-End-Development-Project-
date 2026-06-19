const pool = require('../services/db');

module.exports.incrementLevel = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE user
        SET level = level + 1,
            level_up_cost = FLOOR(level_up_cost + LOG(level + 1) * 50)
        WHERE id = ?;
    `;
	const VALUES = [data.userId];
	pool.query(SQLSTATMENT, VALUES, callback);
};

module.exports.updateLevelAndExperience = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE user
        SET level = ?,
            experience = ?
        WHERE id = ?;
    `;
	const VALUES = [data.level, data.experience, data.userId];
	pool.query(SQLSTATMENT, VALUES, callback);
};
