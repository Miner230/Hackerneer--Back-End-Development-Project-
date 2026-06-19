const pool = require('../services/db');

function columnExists(table, column, callback) {
	pool.query(
		`SELECT COUNT(*) AS count
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?`,
		[table, column],
		(error, rows) => {
			if (error) return callback(error);
			callback(null, rows[0]?.count > 0);
		}
	);
}

function addColumnIfMissing(table, column, definition, callback) {
	columnExists(table, column, (error, exists) => {
		if (error) return callback(error);
		if (exists) return callback(null);

		pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, callback);
	});
}

addColumnIfMissing('user_dice', 'instance_rarity', "VARCHAR(32) NOT NULL DEFAULT 'Common'", (rarityError) => {
	if (rarityError) {
		console.error('Failed to add user_dice.instance_rarity:', rarityError);
		process.exit(1);
	}

	addColumnIfMissing('user_dice', 'drop_rarity_score', 'INT NOT NULL DEFAULT 100', (scoreError) => {
		if (scoreError) {
			console.error('Failed to add user_dice.drop_rarity_score:', scoreError);
			process.exit(1);
		}

		pool.query(
			`UPDATE user_dice
             INNER JOIN loot ON loot.id = user_dice.loot_id
             SET user_dice.instance_rarity = loot.rarity
             WHERE user_dice.instance_rarity = 'Common'`,
			(backfillError) => {
				if (backfillError) {
					console.error('Failed to backfill dice instance rarity:', backfillError);
					process.exit(1);
				}

				console.log('Dice instance rarity columns are ready.');
				process.exit(0);
			}
		);
	});
});
