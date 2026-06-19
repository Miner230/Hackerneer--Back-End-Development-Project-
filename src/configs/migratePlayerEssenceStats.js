const pool = require('../services/db');

const USER_COLUMNS = [
	{ name: 'player_flat_health', definition: 'INT NOT NULL DEFAULT 0' },
	{ name: 'player_max_health_percent', definition: 'INT NOT NULL DEFAULT 0' },
	{ name: 'damage_reduction_penetration', definition: 'INT NOT NULL DEFAULT 0' },
	{ name: 'player_life_regen', definition: 'INT NOT NULL DEFAULT 0' },
];

const DELVE_COLUMNS = [
	{ name: 'player_life_regen', definition: 'INT NOT NULL DEFAULT 0' },
	{ name: 'damage_reduction_penetration', definition: 'INT NOT NULL DEFAULT 0' },
];

const NEW_ESSENCES = [
	['Lesser Essence of vigor', 'player_flat_health', '+25 flat max health ♥', 25, 'Common', 'Warmth spreads through your core.', 50, 200],
	['Mediocre Essence of vigor', 'player_flat_health', '+50 flat max health ♥', 50, 'Uncommon', 'Your body hardens against the abyss.', 100, 100],
	['Refined Essence of vigor', 'player_flat_health', '+75 flat max health ♥', 75, 'Rare', 'Vitality becomes second nature.', 150, 50],
	['Greater Essence of vigor', 'player_flat_health', '+100 flat max health ♥', 100, 'Epic', 'You are a fortress of flesh.', 300, 10],
	['Perfect Essence of vigor', 'player_flat_health', '+150 flat max health ♥', 150, 'Legendary', 'Life itself kneels to your will.', 500, 1],

	['Lesser Essence of fortitude', 'player_max_health_percent', '+2% max health ♡', 2, 'Common', 'A faint bulwark forms within.', 50, 200],
	['Mediocre Essence of fortitude', 'player_max_health_percent', '+4% max health ♡', 4, 'Uncommon', 'Your limits stretch outward.', 100, 100],
	['Refined Essence of fortitude', 'player_max_health_percent', '+6% max health ♡', 6, 'Rare', 'Endurance reshapes your frame.', 150, 50],
	['Greater Essence of fortitude', 'player_max_health_percent', '+8% max health ♡', 8, 'Epic', 'You outgrow mortal bounds.', 300, 10],
	['Perfect Essence of fortitude', 'player_max_health_percent', '+12% max health ♡', 12, 'Legendary', 'Your life pool becomes an ocean.', 500, 1],

	['Lesser Essence of sunder', 'damage_reduction_penetration', '+2 DR penetration ⚔', 2, 'Common', 'Armor feels thinner already.', 50, 200],
	['Mediocre Essence of sunder', 'damage_reduction_penetration', '+4 DR penetration ⚔', 4, 'Uncommon', 'Defenses crack before you strike.', 100, 100],
	['Refined Essence of sunder', 'damage_reduction_penetration', '+6 DR penetration ⚔', 6, 'Rare', 'You carve through resistance.', 150, 50],
	['Greater Essence of sunder', 'damage_reduction_penetration', '+8 DR penetration ⚔', 8, 'Epic', 'No shell can hide from you.', 300, 10],
	['Perfect Essence of sunder', 'damage_reduction_penetration', '+12 DR penetration ⚔', 12, 'Legendary', 'You unmake every ward.', 500, 1],

	['Lesser Essence of renewal', 'player_life_regen', '+3 life regen per turn ✚', 3, 'Common', 'Wounds close in quiet moments.', 50, 200],
	['Mediocre Essence of renewal', 'player_life_regen', '+6 life regen per turn ✚', 6, 'Uncommon', 'Breath returns between blows.', 100, 100],
	['Refined Essence of renewal', 'player_life_regen', '+10 life regen per turn ✚', 10, 'Rare', 'Your pulse mends what breaks.', 150, 50],
	['Greater Essence of renewal', 'player_life_regen', '+15 life regen per turn ✚', 15, 'Epic', 'Recovery outpaces ruin.', 300, 10],
	['Perfect Essence of renewal', 'player_life_regen', '+25 life regen per turn ✚', 25, 'Legendary', 'Death must wait its turn.', 500, 1],
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

function migrateColumns(table, columns, index, callback) {
	if (index >= columns.length) return callback(null);

	addColumn(table, columns[index], (error) => {
		if (error) return callback(error);
		migrateColumns(table, columns, index + 1, callback);
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

migrateColumns('user', USER_COLUMNS, 0, (userError) => {
	if (userError) {
		console.error('Player essence migration failed:', userError.message);
		return process.exit(1);
	}

	migrateColumns('delve_instances', DELVE_COLUMNS, 0, (delveError) => {
		if (delveError) {
			console.error('Player essence migration failed:', delveError.message);
			return process.exit(1);
		}

		insertEssence(0, (lootError) => {
			if (lootError) {
				console.error('Player essence migration failed:', lootError.message);
				return process.exit(1);
			}

			console.log('Player essence stats and loot migrated successfully.');
			process.exit(0);
		});
	});
});
