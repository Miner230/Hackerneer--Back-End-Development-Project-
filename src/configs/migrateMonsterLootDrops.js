const pool = require('../services/db');

const COLUMNS = [
	{ name: 'item_quantity', definition: 'INT NOT NULL DEFAULT 1' },
	{ name: 'item_rarity', definition: 'INT NOT NULL DEFAULT 10' },
];

function columnExists(column, callback) {
	pool.query(
		`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'delve_instances' AND COLUMN_NAME = ?`,
		[column],
		(error, results) => {
			if (error) return callback(error);
			callback(null, results.length > 0);
		}
	);
}

function addColumn({ name, definition }, callback) {
	columnExists(name, (error, exists) => {
		if (error) return callback(error);
		if (exists) return callback();

		pool.query(`ALTER TABLE delve_instances ADD COLUMN ${name} ${definition}`, callback);
	});
}

function migrateFromLootShards(callback) {
	columnExists('loot_shard_count', (error, hasLegacyColumn) => {
		if (error) return callback(error);
		if (!hasLegacyColumn) return callback();

		pool.query(
			`UPDATE delve_instances
       SET item_quantity = GREATEST(item_quantity, loot_shard_count),
           item_rarity = GREATEST(item_rarity, LEAST(100, 8 + FLOOR(level * 0.85)))
       WHERE loot_shard_count IS NOT NULL`,
			(error) => {
				if (error) return callback(error);
				pool.query('ALTER TABLE delve_instances DROP COLUMN loot_shard_count', callback);
			}
		);
	});
}

function runMigration(index = 0) {
	if (index >= COLUMNS.length) {
		return migrateFromLootShards((error) => {
			if (error) {
				console.error('Monster loot migration failed:', error.message);
				return process.exit(1);
			}
			console.log('Monster loot drop columns migrated successfully.');
			process.exit(0);
		});
	}

	addColumn(COLUMNS[index], (error) => {
		if (error) {
			console.error('Monster loot migration failed:', error.message);
			return process.exit(1);
		}
		runMigration(index + 1);
	});
}

runMigration();
