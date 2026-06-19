const pool = require('../services/db');

const DICE_FLAT_DAMAGE = {
	'Basic Die': 0,
	'Crimson Die': 5,
	'Bone Die': 2,
	'Copper Die': 3,
};

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

function addColumnIfMissing(table, callback) {
	columnExists(table, 'flat_damage', (error, exists) => {
		if (error) return callback(error);
		if (exists) return callback(null);

		pool.query(
			`ALTER TABLE ${table} ADD COLUMN flat_damage INT NOT NULL DEFAULT 0`,
			callback
		);
	});
}

addColumnIfMissing('dice', (diceError) => {
	if (diceError) {
		console.error('Dice flat damage migration failed:', diceError.message);
		return process.exit(1);
	}

	addColumnIfMissing('dice_gear', (gearError) => {
		if (gearError) {
			console.error('Dice flat damage migration failed:', gearError.message);
			return process.exit(1);
		}

		const updates = Object.entries(DICE_FLAT_DAMAGE).map(
			([name, flatDamage]) =>
				new Promise((resolve, reject) => {
					pool.query(
						`UPDATE dice_gear dg
             INNER JOIN loot l ON l.id = dg.loot_id
             SET dg.flat_damage = ?
             WHERE l.name = ?`,
						[flatDamage, name],
						(updateError) => (updateError ? reject(updateError) : resolve())
					);
				})
		);

		Promise.all(updates)
			.then(() => {
				console.log('Dice flat damage migrated successfully.');
				process.exit(0);
			})
			.catch((updateError) => {
				console.error('Dice flat damage migration failed:', updateError.message);
				process.exit(1);
			});
	});
});
