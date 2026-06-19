const pool = require('../services/db');
const { rollDiceSocketCount } = require('../utils/diceSockets.js');

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

function tableExists(table, callback) {
	pool.query(
		`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
		[table],
		(error, results) => {
			if (error) return callback(error);
			callback(null, results.length > 0);
		}
	);
}

function migrateSocketCount(callback) {
	columnExists('user_dice', 'socket_count', (error, exists) => {
		if (error) return callback(error);
		if (exists) return callback(null);

		pool.query(
			'ALTER TABLE user_dice ADD COLUMN socket_count INT NOT NULL DEFAULT 0 AFTER item_level',
			(alterError) => {
				if (alterError) return callback(alterError);
				callback(null);
			}
		);
	});
}

function createSocketTable(callback) {
	tableExists('dice_socketed_items', (error, exists) => {
		if (error) return callback(error);
		if (exists) return callback(null);

		pool.query(
			`CREATE TABLE dice_socketed_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        dice_instance_id INT NOT NULL,
        slot_index INT NOT NULL,
        mechanic VARCHAR(64) NOT NULL,
        rolled_value INT NOT NULL,
        source_loot_id INT NOT NULL,
        source_rarity VARCHAR(32) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
			(createError) => {
				if (createError) return callback(createError);
				callback(null);
			}
		);
	});
}

function backfillSocketCounts(callback) {
	pool.query('SELECT id FROM user_dice WHERE socket_count = 0', (error, rows) => {
		if (error) return callback(error);
		if (!rows.length) return callback(null);

		let index = 0;

		function next() {
			if (index >= rows.length) return callback(null);

			const row = rows[index];
			const socketCount = rollDiceSocketCount();

			pool.query(
				'UPDATE user_dice SET socket_count = ? WHERE id = ?',
				[socketCount, row.id],
				(updateError) => {
					if (updateError) return callback(updateError);
					index += 1;
					next();
				}
			);
		}

		next();
	});
}

function migrateFaceModifiersToSockets(callback) {
	pool.query(
		`SELECT dm.*, ud.socket_count
     FROM dice_modifiers dm
     INNER JOIN user_dice ud ON ud.id = dm.dice_instance_id
     WHERE dm.essence_mechanic LIKE 'face_%'`,
		(error, rows) => {
			if (error) return callback(error);
			if (!rows.length) return callback(null);

			let index = 0;

			function next() {
				if (index >= rows.length) return callback(null);

				const row = rows[index];

				pool.query(
					'SELECT COUNT(*) AS count FROM dice_socketed_items WHERE dice_instance_id = ?',
					[row.dice_instance_id],
					(countError, countRows) => {
						if (countError) return callback(countError);

						const usedSockets = Number(countRows[0]?.count || 0);
						if (usedSockets >= Number(row.socket_count || 0)) {
							index += 1;
							return next();
						}

						pool.query(
							`INSERT INTO dice_socketed_items
              (user_id, dice_instance_id, slot_index, mechanic, rolled_value, source_loot_id, source_rarity)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
							[
								row.user_id,
								row.dice_instance_id,
								usedSockets,
								row.essence_mechanic,
								row.rolled_value,
								row.source_loot_id,
								row.source_rarity,
							],
							(insertError) => {
								if (insertError) return callback(insertError);

								pool.query(
									'DELETE FROM dice_modifiers WHERE id = ?',
									[row.id],
									(deleteError) => {
										if (deleteError) return callback(deleteError);
										index += 1;
										next();
									}
								);
							}
						);
					}
				);
			}

			next();
		}
	);
}

migrateSocketCount((socketCountError) => {
	if (socketCountError) {
		console.error('Dice sockets migration failed:', socketCountError.message);
		return process.exit(1);
	}

	createSocketTable((tableError) => {
		if (tableError) {
			console.error('Dice sockets migration failed:', tableError.message);
			return process.exit(1);
		}

		backfillSocketCounts((backfillError) => {
			if (backfillError) {
				console.error('Dice sockets migration failed:', backfillError.message);
				return process.exit(1);
			}

			migrateFaceModifiersToSockets((migrateError) => {
				if (migrateError) {
					console.error('Dice sockets migration failed:', migrateError.message);
					return process.exit(1);
				}

				console.log('Dice sockets migrated successfully.');
				process.exit(0);
			});
		});
	});
});
