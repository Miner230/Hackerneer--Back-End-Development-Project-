const pool = require('../services/db');

const COLUMNS = [
	{ name: 'player_health', definition: 'INT NOT NULL DEFAULT 100' },
	{ name: 'player_max_health', definition: 'INT NOT NULL DEFAULT 100' },
	{ name: 'player_damage_reduction', definition: 'INT NOT NULL DEFAULT 0' },
	{ name: 'monster_attack', definition: 'INT NOT NULL DEFAULT 15' },
];

function columnExists(callback) {
	pool.query(
		`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'delve_instances' AND COLUMN_NAME = ?`,
		[callback.column],
		(error, results) => {
			if (error) return callback.done(error);
			if (results.length > 0) return callback.next();
			pool.query(
				`ALTER TABLE delve_instances ADD COLUMN ${callback.column} ${callback.definition}`,
				(alterError) => {
					if (alterError) return callback.done(alterError);
					callback.next();
				}
			);
		}
	);
}

function runMigration(index = 0) {
	if (index >= COLUMNS.length) {
		console.log('Delve combat columns migrated successfully.');
		return process.exit(0);
	}

	const { name, definition } = COLUMNS[index];
	columnExists({
		column: name,
		definition,
		next: () => runMigration(index + 1),
		done: (error) => {
			console.error('Delve combat migration failed:', error.message);
			process.exit(1);
		},
	});
}

runMigration();
