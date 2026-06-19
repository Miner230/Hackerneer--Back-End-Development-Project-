const pool = require('../services/db');

function columnExists(table, column, callback) {
	pool.query(
		`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
		[table, column],
		(error, results) => {
			if (error) return callback(error);
			callback(null, results.length > 0);
		}
	);
}

columnExists('user', 'experience', (error, exists) => {
	if (error) {
		console.error('Player experience migration failed:', error.message);
		return process.exit(1);
	}

	if (exists) {
		console.log('Player experience already migrated.');
		return process.exit(0);
	}

	pool.query('ALTER TABLE user ADD COLUMN experience INT NOT NULL DEFAULT 0 AFTER level', (alterError) => {
		if (alterError) {
			console.error('Player experience migration failed:', alterError.message);
			return process.exit(1);
		}

		console.log('Player experience migrated successfully.');
		process.exit(0);
	});
});
