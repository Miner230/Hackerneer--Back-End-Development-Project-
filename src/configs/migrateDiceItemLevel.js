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

columnExists('user_dice', 'item_level', (error, exists) => {
	if (error) {
		console.error('Dice item level migration failed:', error.message);
		return process.exit(1);
	}

	if (exists) {
		console.log('Dice item level already migrated.');
		return process.exit(0);
	}

	pool.query(
		'ALTER TABLE user_dice ADD COLUMN item_level INT NOT NULL DEFAULT 1 AFTER loot_id',
		(alterError) => {
			if (alterError) {
				console.error('Dice item level migration failed:', alterError.message);
				return process.exit(1);
			}

			console.log('Dice item level migrated successfully.');
			process.exit(0);
		}
	);
});
