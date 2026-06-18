const pool = require('../services/db');

function columnExists(column, callback) {
	pool.query(
		`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'delve_modifiers' AND COLUMN_NAME = ?`,
		[column],
		(error, results) => {
			if (error) return callback(error);
			callback(null, results.length > 0);
		}
	);
}

columnExists('id', (error, hasIdColumn) => {
	if (error) {
		console.error('Delve modifier stack migration failed:', error.message);
		return process.exit(1);
	}

	if (hasIdColumn) {
		console.log('delve_modifiers already supports stacked modifiers.');
		return process.exit(0);
	}

	pool.query('ALTER TABLE delve_modifiers DROP PRIMARY KEY', (dropError) => {
		if (dropError) {
			console.error('Delve modifier stack migration failed:', dropError.message);
			return process.exit(1);
		}

		pool.query(
			'ALTER TABLE delve_modifiers ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST',
			(addError) => {
				if (addError) {
					console.error('Delve modifier stack migration failed:', addError.message);
					return process.exit(1);
				}

				console.log('delve_modifiers migrated — duplicate modifier stacks are now allowed.');
				process.exit(0);
			}
		);
	});
});
