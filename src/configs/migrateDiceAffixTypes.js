const pool = require('../services/db');

const AFFIX_TYPE_BY_MECHANIC = {
	crit_chance: 'suffix',
	crit_power: 'suffix',
	duplication_chance: 'suffix',
	duplication_number: 'suffix',
	dice_flat_damage_percent: 'prefix',
	dice_flat_damage_roll: 'prefix',
	face_1: 'prefix',
	face_2: 'prefix',
	face_3: 'prefix',
	face_4: 'prefix',
	face_5: 'prefix',
	face_6: 'prefix',
	player_flat_health: 'suffix',
	player_max_health_percent: 'suffix',
	damage_reduction_penetration: 'prefix',
	player_life_regen: 'suffix',
	player_speed_bonus: 'suffix',
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

columnExists('dice_modifiers', 'affix_type', (error, exists) => {
	if (error) {
		console.error('Dice affix migration failed:', error.message);
		return process.exit(1);
	}

	if (exists) {
		console.log('Dice affix types already migrated.');
		return process.exit(0);
	}

	pool.query(
		`ALTER TABLE dice_modifiers
     ADD COLUMN affix_type ENUM('prefix', 'suffix') NOT NULL DEFAULT 'suffix' AFTER dice_instance_id`,
		(error) => {
			if (error) {
				console.error('Dice affix migration failed:', error.message);
				return process.exit(1);
			}

			const updates = Object.entries(AFFIX_TYPE_BY_MECHANIC).map(
				([mechanic, affixType]) =>
					new Promise((resolve, reject) => {
						pool.query(
							'UPDATE dice_modifiers SET affix_type = ? WHERE essence_mechanic = ?',
							[affixType, mechanic],
							(updateError) => (updateError ? reject(updateError) : resolve())
						);
					})
			);

			Promise.all(updates)
				.then(() => {
					console.log('Dice affix types migrated successfully.');
					process.exit(0);
				})
				.catch((updateError) => {
					console.error('Dice affix migration failed:', updateError.message);
					process.exit(1);
				});
		}
	);
});
