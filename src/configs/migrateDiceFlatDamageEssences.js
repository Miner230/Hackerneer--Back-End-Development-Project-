const pool = require('../services/db');
const { buildLootStatDescription } = require('../utils/lootDescriptions.js');

const FLAT_DAMAGE_ESSENCES = [
	['Lesser Essence of might', 'dice_flat_damage_percent', 5, 'Common', 'A faint edge sharpens every blow.', 50, 200],
	['Mediocre Essence of might', 'dice_flat_damage_percent', 10, 'Uncommon', 'Force gathers behind your rolls.', 100, 100],
	['Refined Essence of might', 'dice_flat_damage_percent', 20, 'Rare', 'Your die strikes with weight.', 150, 50],
	['Greater Essence of might', 'dice_flat_damage_percent', 35, 'Epic', 'Momentum reshapes each outcome.', 300, 10],
	['Perfect Essence of might', 'dice_flat_damage_percent', 67, 'Legendary', 'Every roll hits like a siege engine.', 500, 1],
	['Lesser Essence of edge', 'dice_flat_damage_roll', 1, 'Common', 'A hairline cut on fate itself.', 50, 200],
	['Mediocre Essence of edge', 'dice_flat_damage_roll', 2, 'Uncommon', 'Each face lands a little harder.', 100, 100],
	['Refined Essence of edge', 'dice_flat_damage_roll', 5, 'Rare', 'Steel follows every tumble.', 150, 50],
	['Greater Essence of edge', 'dice_flat_damage_roll', 20, 'Epic', 'Your die leaves wounds in probability.', 300, 10],
	['Perfect Essence of edge', 'dice_flat_damage_roll', 50, 'Legendary', 'Every roll carries ruin.', 500, 1],
];

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

function addColumnIfMissing(table, column, callback) {
	columnExists(table, column, (error, exists) => {
		if (error) return callback(error);
		if (exists) return callback(null);

		pool.query(
			`ALTER TABLE ${table} ADD COLUMN ${column} INT NOT NULL DEFAULT 0`,
			callback
		);
	});
}

function insertEssence(index, callback) {
	if (index >= FLAT_DAMAGE_ESSENCES.length) return callback(null);

	const [name, mechanic, statline, rarity, lore, craftCost, weight] = FLAT_DAMAGE_ESSENCES[index];
	const statDescription = buildLootStatDescription({ name, mechanic, statline, rarity });

	pool.query('SELECT id FROM loot WHERE name = ? LIMIT 1', [name], (selectError, rows) => {
		if (selectError) return callback(selectError);
		if (rows[0]) {
			return pool.query(
				'UPDATE loot SET mechanic = ?, stat_description = ?, statline = ?, rarity = ?, lore = ?, craft_cost = ?, weight = ? WHERE id = ?',
				[mechanic, statDescription, statline, rarity, lore, craftCost, weight, rows[0].id],
				(updateError) => {
					if (updateError) return callback(updateError);
					insertEssence(index + 1, callback);
				}
			);
		}

		pool.query(
			`INSERT INTO loot (name, mechanic, stat_description, statline, rarity, lore, craft_cost, weight)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[name, mechanic, statDescription, statline, rarity, lore, craftCost, weight],
			(insertError) => {
				if (insertError) return callback(insertError);
				insertEssence(index + 1, callback);
			}
		);
	});
}

addColumnIfMissing('dice', 'flat_damage_percent', (percentError) => {
	if (percentError) {
		console.error('Flat damage essence migration failed:', percentError.message);
		return process.exit(1);
	}

	addColumnIfMissing('dice', 'flat_damage_roll_max', (rollError) => {
		if (rollError) {
			console.error('Flat damage essence migration failed:', rollError.message);
			return process.exit(1);
		}

		insertEssence(0, (lootError) => {
			if (lootError) {
				console.error('Flat damage essence migration failed:', lootError.message);
				return process.exit(1);
			}

			console.log('Dice flat damage columns and essence loot migrated successfully.');
			process.exit(0);
		});
	});
});
