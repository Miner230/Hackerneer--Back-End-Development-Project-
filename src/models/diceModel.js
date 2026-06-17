const pool = require('../services/db');

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
