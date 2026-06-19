const pool = require('../services/db');

const USER_COLUMN = { name: 'player_speed_bonus', definition: 'INT NOT NULL DEFAULT 0' };

const NEW_ESSENCES = [
	['Lesser Essence of haste', 'player_speed_bonus', '+1 speed per turn ⚡', 1, 'Common', 'Your reflexes sharpen slightly.', 50, 200],
	['Mediocre Essence of haste', 'player_speed_bonus', '+1 speed per turn ⚡', 1, 'Uncommon', 'You strike before thought catches up.', 100, 100],
	['Refined Essence of haste', 'player_speed_bonus', '+2 speed per turn ⚡', 2, 'Rare', 'Momentum becomes a second weapon.', 150, 50],
	['Greater Essence of haste', 'player_speed_bonus', '+2 speed per turn ⚡', 2, 'Epic', 'The abyss cannot keep pace.', 300, 10],
	['Perfect Essence of haste', 'player_speed_bonus', '+3 speed per turn ⚡', 3, 'Legendary', 'You are a storm between heartbeats.', 500, 1],
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

function addColumn(table, { name, definition }, callback) {
	columnExists(table, name, (error, exists) => {
		if (error) return callback(error);
		if (exists) return callback();

		pool.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`, callback);
	});
}

function insertEssence(index, callback) {
	if (index >= NEW_ESSENCES.length) return callback(null);

	const [name, mechanic, statDescription, statline, rarity, lore, craftCost, weight] =
		NEW_ESSENCES[index];

	pool.query(
		`INSERT INTO loot (name, mechanic, stat_description, statline, rarity, lore, craft_cost, weight)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM loot WHERE name = ?)`,
		[name, mechanic, statDescription, statline, rarity, lore, craftCost, weight, name],
		(error) => {
			if (error) return callback(error);
			insertEssence(index + 1, callback);
		}
	);
}

addColumn('user', USER_COLUMN, (userError) => {
	if (userError) {
		console.error('Player speed essence migration failed:', userError.message);
		return process.exit(1);
	}

	insertEssence(0, (lootError) => {
		if (lootError) {
			console.error('Player speed essence migration failed:', lootError.message);
			return process.exit(1);
		}

		console.log('Player speed essence migrated successfully.');
		process.exit(0);
	});
});
