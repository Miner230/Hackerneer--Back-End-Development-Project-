const pool = require('../services/db');

pool.query(
	`UPDATE dice_modifiers
     SET affix_type = 'suffix', modifier_name = 'of the Haste'
     WHERE essence_mechanic = 'player_speed_bonus'`,
	(error, result) => {
		if (error) {
			console.error('Haste suffix migration failed:', error.message);
			return process.exit(1);
		}

		console.log(
			`Updated ${result.affectedRows || 0} haste modifier row(s) to suffix affix type.`
		);
		process.exit(0);
	}
);
