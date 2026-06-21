const pool = require('../services/db');

function tableExists(callback) {
	pool.query(
		`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_dungeon_runs'`,
		(error, results) => {
			if (error) return callback(error);
			callback(null, results.length > 0);
		}
	);
}

function createTable(callback) {
	const SQL = `
		CREATE TABLE user_dungeon_runs (
			user_id INT NOT NULL PRIMARY KEY,
			run_blob VARCHAR(96) NOT NULL,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)
	`;
	pool.query(SQL, callback);
}

tableExists((error, exists) => {
	if (error) {
		console.error('Dungeon run migration failed:', error.message);
		process.exit(1);
	}

	if (exists) {
		console.log('user_dungeon_runs already exists.');
		process.exit(0);
		return;
	}

	createTable((createError) => {
		if (createError) {
			console.error('Dungeon run migration failed:', createError.message);
			process.exit(1);
		}
		console.log('user_dungeon_runs migrated successfully.');
		process.exit(0);
	});
});
