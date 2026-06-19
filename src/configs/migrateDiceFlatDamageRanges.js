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

addColumnIfMissing('dice', 'flat_damage_min', 'INT NOT NULL DEFAULT 0', (minError) => {
	if (minError) {
		console.error('Failed to add dice.flat_damage_min:', minError);
		process.exit(1);
	}

	addColumnIfMissing('dice', 'flat_damage_max', 'INT NOT NULL DEFAULT 0', (maxError) => {
		if (maxError) {
			console.error('Failed to add dice.flat_damage_max:', maxError);
			process.exit(1);
		}

		addColumnIfMissing('dice', 'flat_damage_roll_min', 'INT NOT NULL DEFAULT 0', (rollMinError) => {
			if (rollMinError) {
				console.error('Failed to add dice.flat_damage_roll_min:', rollMinError);
				process.exit(1);
			}

			console.log('Dice flat damage range columns are ready.');
			process.exit(0);
		});
	});
});
