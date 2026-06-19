const pool = require('../services/db');

function indexExists(indexName, callback) {
	pool.query(
		`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'dice_modifiers'
       AND INDEX_NAME = ?`,
		[indexName],
		(error, results) => {
			if (error) return callback(error);
			callback(null, results.length > 0);
		}
	);
}

indexExists('uniq_dice_slot', (error, exists) => {
	if (error) {
		console.error('Dice slot unique migration failed:', error.message);
		return process.exit(1);
	}

	if (!exists) {
		console.log('Dice slot unique index already removed.');
		return process.exit(0);
	}

	pool.query('ALTER TABLE dice_modifiers DROP INDEX uniq_dice_slot', (dropError) => {
		if (dropError) {
			console.error('Dice slot unique migration failed:', dropError.message);
			return process.exit(1);
		}

		console.log('Dice slot unique index removed successfully.');
		process.exit(0);
	});
});
