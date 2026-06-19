const pool = require('../services/db');
const {
	RARITY_TIERS,
	DICE_FAMILY_LORE,
	getDieFamilyGearForTier,
	buildDiceGearStatDescription,
	getDiceTiersForFamily,
	getDiceDropWeight,
} = require('../utils/diceTierDefinitions.js');

const DICE_FAMILIES = ['Basic Die', 'Crimson Die', 'Bone Die', 'Copper Die'];

function runQuery(sql, values = []) {
	return new Promise((resolve, reject) => {
		pool.query(sql, values, (error, results) => {
			if (error) reject(error);
			else resolve(results);
		});
	});
}

async function upsertDiceTierRow(familyName, rarity) {
	const gear = getDieFamilyGearForTier(familyName, rarity);
	const statDescription = buildDiceGearStatDescription(familyName, gear);
	const lore = DICE_FAMILY_LORE[familyName] || '';
	const weight = getDiceDropWeight(familyName);

	const existing = await runQuery(
		`SELECT id FROM loot WHERE name = ? AND rarity = ? AND mechanic = 'equip_dice' LIMIT 1`,
		[familyName, rarity]
	);

	let lootId;

	if (existing.length) {
		lootId = existing[0].id;
		await runQuery(
			`UPDATE loot
       SET stat_description = ?, lore = ?, weight = ?
       WHERE id = ?`,
			[statDescription, lore, weight, lootId]
		);
	} else {
		const insert = await runQuery(
			`INSERT INTO loot (name, mechanic, stat_description, statline, rarity, lore, craft_cost, weight)
       VALUES (?, 'equip_dice', ?, 0, ?, ?, 0, ?)`,
			[familyName, statDescription, rarity, lore, weight]
		);
		lootId = insert.insertId;
	}

	const gearExists = await runQuery(`SELECT loot_id FROM dice_gear WHERE loot_id = ?`, [lootId]);

	if (gearExists.length) {
		await runQuery(
			`UPDATE dice_gear
       SET image_key = ?, side_1 = ?, side_2 = ?, side_3 = ?, side_4 = ?, side_5 = ?, side_6 = ?,
           no_of_rolls = ?, duplication_chance = ?, duplication_number = ?,
           crit_chance = ?, crit_power = ?, flat_damage = ?
       WHERE loot_id = ?`,
			[
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
				gear.flat_damage,
				lootId,
			]
		);
	} else {
		await runQuery(
			`INSERT INTO dice_gear
        (loot_id, image_key, side_1, side_2, side_3, side_4, side_5, side_6,
         no_of_rolls, duplication_chance, duplication_number, crit_chance, crit_power, flat_damage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
				gear.flat_damage,
			]
		);
	}

	return lootId;
}

async function remapUserDiceInstances() {
	const rows = await runQuery(
		`SELECT
       user_dice.id,
       user_dice.loot_id,
       loot.name,
       loot.rarity AS loot_rarity,
       user_dice.instance_rarity
     FROM user_dice
     INNER JOIN loot ON loot.id = user_dice.loot_id`
	);

	for (const row of rows) {
		const targetRarity = RARITY_TIERS.includes(row.instance_rarity)
			? row.instance_rarity
			: row.loot_rarity;
		const tiers = getDiceTiersForFamily(row.name);
		const normalizedRarity = tiers.includes(targetRarity) ? targetRarity : tiers[0];

		const target = await runQuery(
			`SELECT id FROM loot
       WHERE name = ? AND rarity = ? AND mechanic = 'equip_dice'
       LIMIT 1`,
			[row.name, normalizedRarity]
		);

		if (!target.length) continue;

		const targetLootId = target[0].id;
		if (targetLootId !== row.loot_id) {
			await runQuery(`UPDATE user_dice SET loot_id = ? WHERE id = ?`, [targetLootId, row.id]);
		}
	}
}

async function removeOrphanDiceLoot() {
	const validRows = await runQuery(
		`SELECT id FROM loot WHERE mechanic = 'equip_dice'`
	);
	const validIds = new Set(validRows.map((row) => row.id));

	const allDiceLoot = await runQuery(
		`SELECT id, name, rarity FROM loot WHERE mechanic = 'equip_dice'`
	);

	const expectedKeys = new Set();
	for (const family of DICE_FAMILIES) {
		for (const rarity of getDiceTiersForFamily(family)) {
			expectedKeys.add(`${family}::${rarity}`);
		}
	}

	for (const row of allDiceLoot) {
		const key = `${row.name}::${row.rarity}`;
		if (expectedKeys.has(key)) continue;

		const inUse = await runQuery(`SELECT id FROM user_dice WHERE loot_id = ? LIMIT 1`, [row.id]);
		if (inUse.length) {
			console.warn(
				`Skipping orphan dice loot id=${row.id} (${row.name} ${row.rarity}) — still referenced by user_dice.`
			);
			continue;
		}

		if (!validIds.has(row.id)) continue;

		await runQuery(`DELETE FROM dice_gear WHERE loot_id = ?`, [row.id]);
		await runQuery(`DELETE FROM loot WHERE id = ?`, [row.id]);
	}
}

async function migrate() {
	for (const family of DICE_FAMILIES) {
		for (const rarity of getDiceTiersForFamily(family)) {
			await upsertDiceTierRow(family, rarity);
		}
	}

	await remapUserDiceInstances();
	await removeOrphanDiceLoot();

	console.log('Dice rarity tier migration completed successfully.');
	process.exit(0);
}

migrate().catch((error) => {
	console.error('Dice rarity tier migration failed:', error.message);
	process.exit(1);
});
