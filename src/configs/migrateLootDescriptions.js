const pool = require('../services/db');
const { buildLootStatDescription } = require('../utils/lootDescriptions.js');

pool.query('SELECT id, name, mechanic, statline, rarity FROM loot', (error, rows) => {
	if (error) {
		console.error('Loot description migration failed:', error.message);
		return process.exit(1);
	}

	if (!rows.length) {
		console.log('No loot rows to update.');
		return process.exit(0);
	}

	let index = 0;

	function next() {
		if (index >= rows.length) {
			console.log(`Loot descriptions updated for ${rows.length} item(s).`);
			return process.exit(0);
		}

		const row = rows[index];
		const statDescription = buildLootStatDescription(row);

		pool.query(
			'UPDATE loot SET stat_description = ? WHERE id = ?',
			[statDescription, row.id],
			(updateError) => {
				if (updateError) {
					console.error('Loot description migration failed:', updateError.message);
					return process.exit(1);
				}
				index += 1;
				next();
			}
		);
	}

	next();
});
