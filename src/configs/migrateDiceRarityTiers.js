const {
	RARITY_TIERS,
	getDiceTiersForFamily,
} = require('../utils/diceTierDefinitions.js');
const {
	DICE_FAMILIES,
	ensureAllDiceTierLootRows,
	runQuery,
} = require('../utils/diceTierLootUpsert.js');

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
	const validRows = await runQuery(`SELECT id FROM loot WHERE mechanic = 'equip_dice'`);
	const validIds = new Set(validRows.map((row) => row.id));

	const allDiceLoot = await runQuery(`SELECT id, name, rarity FROM loot WHERE mechanic = 'equip_dice'`);

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
	await ensureAllDiceTierLootRows();
	await remapUserDiceInstances();
	await removeOrphanDiceLoot();

	console.log('Dice rarity tier migration completed successfully.');
	process.exit(0);
}

migrate().catch((error) => {
	console.error('Dice rarity tier migration failed:', error.message);
	process.exit(1);
});
