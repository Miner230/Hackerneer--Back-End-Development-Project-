const pool = require('../services/db');

pool.query(
	`DELETE FROM inventory
   WHERE loot_id IN (SELECT id FROM loot WHERE mechanic = 'no_of_rolls')`,
	(inventoryError) => {
		if (inventoryError) {
			console.error('Failed to remove no_of_rolls inventory:', inventoryError.message);
			process.exit(1);
		}

		pool.query(`DELETE FROM loot WHERE mechanic = 'no_of_rolls'`, (lootError, results) => {
			if (lootError) {
				console.error('Failed to remove no_of_rolls loot:', lootError.message);
				process.exit(1);
			}

			console.log(`Removed ${results.affectedRows} no_of_rolls loot item(s).`);
			process.exit(0);
		});
	}
);
