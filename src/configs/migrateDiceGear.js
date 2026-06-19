const pool = require('../services/db');

const DICE_LOOT = [
	{
		name: 'Basic Die',
		statDescription: '5 rolls · balanced starter die',
		lore: 'Every delver begins with a humble cube.',
		rarity: 'Common',
		weight: 0,
		gear: {
			image_key: 'dice1',
			side_1: 10,
			side_2: 10,
			side_3: 10,
			side_4: 10,
			side_5: 10,
			side_6: 10,
			no_of_rolls: 5,
			duplication_chance: 5,
			duplication_number: 1,
			crit_chance: 10,
			crit_power: 200,
			flat_damage: 0,
		},
	},
	{
		name: 'Crimson Die',
		statDescription: 'Crit chance 18% · Crit power 240%',
		lore: 'A blood-stained cube that hungers for critical strikes.',
		gear: {
			image_key: 'dice1',
			side_1: 10,
			side_2: 10,
			side_3: 10,
			side_4: 10,
			side_5: 10,
			side_6: 10,
			no_of_rolls: 5,
			duplication_chance: 5,
			duplication_number: 1,
			crit_chance: 18,
			crit_power: 240,
			flat_damage: 5,
		},
	},
	{
		name: 'Bone Die',
		statDescription: '8 rolls · balanced faces',
		lore: 'Carved from a fallen delver\'s remains.',
		gear: {
			image_key: 'dice1',
			side_1: 10,
			side_2: 10,
			side_3: 10,
			side_4: 10,
			side_5: 10,
			side_6: 10,
			no_of_rolls: 8,
			duplication_chance: 5,
			duplication_number: 1,
			crit_chance: 10,
			crit_power: 200,
			flat_damage: 2,
		},
	},
	{
		name: 'Copper Die',
		statDescription: 'Duplication 12% · Dup count 2',
		lore: 'Warm metal that echoes every lucky roll.',
		gear: {
			image_key: 'dice1',
			side_1: 10,
			side_2: 10,
			side_3: 10,
			side_4: 10,
			side_5: 10,
			side_6: 10,
			no_of_rolls: 5,
			duplication_chance: 12,
			duplication_number: 2,
			crit_chance: 10,
			crit_power: 200,
			flat_damage: 3,
		},
	},
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

function runStep(sql, callback) {
	pool.query(sql, callback);
}

function insertDiceLoot(index, callback) {
	if (index >= DICE_LOOT.length) return callback(null);

	const entry = DICE_LOOT[index];
	const rarity = entry.rarity || 'Uncommon';
	const weight = entry.weight ?? 12;

	pool.query(
		`INSERT INTO loot (name, mechanic, stat_description, statline, rarity, lore, craft_cost, weight)
     SELECT ?, 'equip_dice', ?, 0, ?, ?, 0, ?
     WHERE NOT EXISTS (SELECT 1 FROM loot WHERE name = ?)`,
		[entry.name, entry.statDescription, rarity, entry.lore, weight, entry.name],
		(error) => {
			if (error) return callback(error);

			pool.query('SELECT id FROM loot WHERE name = ?', [entry.name], (lootError, rows) => {
				if (lootError) return callback(lootError);
				if (!rows.length) return insertDiceLoot(index + 1, callback);

				const lootId = rows[0].id;
				const gear = entry.gear;

				pool.query(
					`INSERT INTO dice_gear
          (loot_id, image_key, side_1, side_2, side_3, side_4, side_5, side_6,
           no_of_rolls, duplication_chance, duplication_number, crit_chance, crit_power, flat_damage)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM dice_gear WHERE loot_id = ?)`,
					[
						lootId,
						gear.image_key,
						gear.side_1,
						gear.side_2,
						gear.side_3,
						gear.side_4,
						gear.side_5,
						gear.side_6,
						gear.no_of_rolls,
						gear.duplication_chance,
						gear.duplication_number,
						gear.crit_chance,
						gear.crit_power,
						gear.flat_damage ?? 0,
						lootId,
					],
					(gearError) => {
						if (gearError) return callback(gearError);
						insertDiceLoot(index + 1, callback);
					}
				);
			});
		}
	);
}

columnExists('user', 'equipped_dice_loot_id', (userColError, userColExists) => {
	if (userColError) {
		console.error('Dice gear migration failed:', userColError.message);
		return process.exit(1);
	}

	const userColumnStep = userColExists
		? (cb) => cb(null)
		: (cb) =>
				runStep('ALTER TABLE user ADD COLUMN equipped_dice_loot_id INT NULL', cb);

	userColumnStep((alterError) => {
		if (alterError) {
			console.error('Dice gear migration failed:', alterError.message);
			return process.exit(1);
		}

		runStep(
			`CREATE TABLE IF NOT EXISTS dice_gear (
        loot_id INT PRIMARY KEY,
        image_key VARCHAR(64) NOT NULL,
        side_1 INT NOT NULL DEFAULT 10,
        side_2 INT NOT NULL DEFAULT 10,
        side_3 INT NOT NULL DEFAULT 10,
        side_4 INT NOT NULL DEFAULT 10,
        side_5 INT NOT NULL DEFAULT 10,
        side_6 INT NOT NULL DEFAULT 10,
        no_of_rolls INT NOT NULL DEFAULT 5,
        duplication_chance INT NOT NULL DEFAULT 5,
        duplication_number INT NOT NULL DEFAULT 1,
        crit_chance INT NOT NULL DEFAULT 10,
        crit_power INT NOT NULL DEFAULT 200,
        flat_damage INT NOT NULL DEFAULT 0
      )`,
			(tableError) => {
				if (tableError) {
					console.error('Dice gear migration failed:', tableError.message);
					return process.exit(1);
				}

				insertDiceLoot(0, (lootError) => {
					if (lootError) {
						console.error('Dice gear migration failed:', lootError.message);
						return process.exit(1);
					}

					console.log('Dice gear migration completed successfully.');
					process.exit(0);
				});
			}
		);
	});
});
