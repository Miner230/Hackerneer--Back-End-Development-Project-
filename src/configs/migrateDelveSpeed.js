const pool = require('../services/db');

const COLUMNS = [
	{ name: 'active_turn', definition: "VARCHAR(10) NOT NULL DEFAULT 'player'" },
	{ name: 'player_speed', definition: 'INT NOT NULL DEFAULT 2' },
	{ name: 'monster_speed', definition: 'INT NOT NULL DEFAULT 2' },
	{ name: 'attacks_remaining', definition: 'INT NOT NULL DEFAULT 2' },
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
		pool.query(
			`UPDATE delve_instances
       SET active_turn = 'player',
           player_speed = COALESCE(player_speed, 2),
           monster_speed = COALESCE(monster_speed, 2),
           attacks_remaining = COALESCE(attacks_remaining, player_speed, 2)
       WHERE active_turn IS NULL OR attacks_remaining IS NULL`,
			() => {
				console.log('Delve speed columns migrated successfully.');
				process.exit(0);
			}
		);
		return;
	}

	const { name, definition } = COLUMNS[index];
	columnExists({
		column: name,
		definition,
		next: () => runMigration(index + 1),
		done: (error) => {
			console.error('Delve speed migration failed:', error.message);
			process.exit(1);
		},
	});
}

runMigration();
