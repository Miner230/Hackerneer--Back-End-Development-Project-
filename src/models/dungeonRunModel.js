const pool = require('../services/db');

module.exports.selectByUserId = (userId, callback) => {
	pool.query('SELECT run_blob FROM user_dungeon_runs WHERE user_id = ? LIMIT 1', [userId], callback);
};

module.exports.upsert = (userId, runBlob, callback) => {
	const SQL = `
		INSERT INTO user_dungeon_runs (user_id, run_blob)
		VALUES (?, ?)
		ON DUPLICATE KEY UPDATE run_blob = VALUES(run_blob)
	`;
	pool.query(SQL, [userId, runBlob], callback);
};

module.exports.deleteByUserId = (userId, callback) => {
	pool.query('DELETE FROM user_dungeon_runs WHERE user_id = ?', [userId], callback);
};
