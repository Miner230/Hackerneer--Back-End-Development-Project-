const pool = require('../services/db');

function tableExists(callback) {
	pool.query(
		`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'delve_enemies'`,
		(error, results) => {
			if (error) return callback(error);
			callback(null, results.length > 0);
		}
	);
}

function columnExists(tableName, columnName, callback) {
	pool.query(
		`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
		[tableName, columnName],
		(error, results) => {
			if (error) return callback(error);
			callback(null, results.length > 0);
		}
	);
}

function createDelveEnemiesTable(callback) {
	const SQL = `
		CREATE TABLE delve_enemies (
			id INT AUTO_INCREMENT PRIMARY KEY,
			delve_instance_id INT NOT NULL,
			slot_index INT NOT NULL,
			monster_id INT NOT NULL,
			monster_name TEXT NOT NULL,
			level INT NOT NULL,
			max_health INT NOT NULL,
			health INT NOT NULL,
			life_regen INT NOT NULL DEFAULT 0,
			damage_reduction INT NOT NULL DEFAULT 0,
			roll_attempt INT NOT NULL DEFAULT 0,
			item_quantity INT NOT NULL DEFAULT 1,
			item_rarity INT NOT NULL DEFAULT 0,
			monster_speed INT NOT NULL DEFAULT 2,
			status VARCHAR(20) NOT NULL DEFAULT 'alive',
			UNIQUE KEY uq_delve_enemy_slot (delve_instance_id, slot_index)
		)
	`;
	pool.query(SQL, callback);
}

function addDelveEnemyIdColumn(callback) {
	columnExists('delve_modifiers', 'delve_enemy_id', (error, exists) => {
		if (error) return callback(error);
		if (exists) return callback(null);

		pool.query(
			'ALTER TABLE delve_modifiers ADD COLUMN delve_enemy_id INT NULL AFTER modifier_id',
			callback
		);
	});
}

function backfillEnemies(callback) {
	pool.query(
		`SELECT
			d.id,
			d.monster_id,
			d.monster_name,
			d.level,
			d.health,
			d.life_regen,
			d.damage_reduction,
			d.roll_attempt,
			d.item_quantity,
			d.item_rarity,
			d.monster_speed
		FROM delve_instances d
		LEFT JOIN delve_enemies de ON de.delve_instance_id = d.id
		WHERE de.id IS NULL`,
		(error, rows) => {
			if (error) return callback(error);
			if (!rows.length) return callback(null);

			let index = 0;

			const insertNext = (insertError) => {
				if (insertError) return callback(insertError);
				if (index >= rows.length) return linkLegacyModifiers(callback);

				const row = rows[index];
				index += 1;

				pool.query(
					`INSERT INTO delve_enemies (
						delve_instance_id, slot_index, monster_id, monster_name,
						level, max_health, health, life_regen, damage_reduction,
						roll_attempt, item_quantity, item_rarity, monster_speed, status
					) VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						row.id,
						row.monster_id,
						row.monster_name,
						row.level,
						row.health,
						row.health,
						row.life_regen,
						row.damage_reduction,
						row.roll_attempt,
						row.item_quantity,
						row.item_rarity,
						row.monster_speed,
						row.health > 0 ? 'alive' : 'dead',
					],
					(enemyError, result) => {
						if (enemyError) return callback(enemyError);

						const enemyId = result.insertId;
						pool.query(
							`UPDATE delve_modifiers
							 SET delve_enemy_id = ?
							 WHERE delve_instance_id = ? AND delve_enemy_id IS NULL`,
							[enemyId, row.id],
							insertNext
						);
					}
				);
			};

			insertNext(null);
		}
	);
}

function linkLegacyModifiers(callback) {
	pool.query(
		`UPDATE delve_modifiers dm
		 JOIN delve_enemies de ON de.delve_instance_id = dm.delve_instance_id AND de.slot_index = 0
		 SET dm.delve_enemy_id = de.id
		 WHERE dm.delve_enemy_id IS NULL`,
		callback
	);
}

function runMigration() {
	tableExists((tableError, exists) => {
		if (tableError) {
			console.error('Delve enemies migration failed:', tableError.message);
			process.exit(1);
		}

		const afterTable = () => {
			addDelveEnemyIdColumn((columnError) => {
				if (columnError) {
					console.error('Delve enemies migration failed:', columnError.message);
					process.exit(1);
				}

				backfillEnemies((backfillError) => {
					if (backfillError) {
						console.error('Delve enemies migration failed:', backfillError.message);
						process.exit(1);
					}

					console.log('Delve enemies migrated successfully.');
					process.exit(0);
				});
			});
		};

		if (exists) return afterTable();
		createDelveEnemiesTable((createError) => {
			if (createError) {
				console.error('Delve enemies migration failed:', createError.message);
				process.exit(1);
			}
			afterTable();
		});
	});
}

runMigration();
