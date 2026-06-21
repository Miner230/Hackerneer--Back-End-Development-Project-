const pool = require('../services/db');

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

columnExists('dice_modifiers', 'source_kind', (error, exists) => {
	if (error) {
		console.error('Failed to check dice_modifiers.source_kind:', error);
		process.exit(1);
	}

	if (exists) {
		console.log('dice_modifiers.source_kind already exists.');
		process.exit(0);
	}

	pool.query(
		`ALTER TABLE dice_modifiers
     ADD COLUMN source_kind ENUM('crafted', 'intrinsic') NOT NULL DEFAULT 'crafted'
     AFTER source_rarity`,
		(alterError) => {
			if (alterError) {
				console.error('Failed to add dice_modifiers.source_kind:', alterError);
				process.exit(1);
			}

			console.log('dice_modifiers.source_kind column added.');

			columnExists('dice_modifiers', 'created_at', (createdAtError, hasCreatedAt) => {
				if (createdAtError) {
					console.error('Failed to check dice_modifiers.created_at:', createdAtError);
					process.exit(1);
				}

				if (!hasCreatedAt) {
					console.log(
						'dice_modifiers.source_kind migration complete (no created_at column; existing rows stay crafted until re-dropped).'
					);
					process.exit(0);
					return;
				}

				pool.query(
					`UPDATE dice_modifiers dm
           JOIN user_dice ud
             ON dm.user_id = ud.user_id AND dm.dice_instance_id = ud.id
           SET dm.source_kind = 'intrinsic'
           WHERE ABS(TIMESTAMPDIFF(SECOND, dm.created_at, ud.created_at)) <= 30`,
					(backfillError, result) => {
						if (backfillError) {
							console.error('Failed to backfill intrinsic drop modifiers:', backfillError);
							process.exit(1);
						}

						console.log(
							`dice_modifiers.source_kind migration complete (backfilled ${result?.affectedRows ?? 0} intrinsic rows).`
						);
						process.exit(0);
					}
				);
			});
		}
	);
});
