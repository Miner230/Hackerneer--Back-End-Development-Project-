const pool = require('../services/db');
const {
	getTierDropWeight,
	getCraftingMaterialDropWeight,
	RARITY_TIERS,
} = require('../utils/lootDropWeights.js');
const { ensureAllDiceTierLootRows } = require('../utils/diceTierLootUpsert.js');

function runQuery(sql, values = []) {
	return new Promise((resolve, reject) => {
		pool.query(sql, values, (error, results) => {
			if (error) reject(error);
			else resolve(results);
		});
	});
}

async function migrate() {
	await ensureAllDiceTierLootRows();

	const materialWeight = getCraftingMaterialDropWeight();

	const materialResult = await runQuery(
		`UPDATE loot
     SET weight = ?
     WHERE mechanic != 'equip_dice'`,
		[materialWeight]
	);

	let diceUpdated = 0;
	for (const rarity of RARITY_TIERS) {
		const tierWeight = getTierDropWeight(rarity);
		const result = await runQuery(
			`UPDATE loot
       SET weight = ?
       WHERE mechanic = 'equip_dice'
         AND name IN ('Crimson Die', 'Bone Die', 'Copper Die')
         AND rarity = ?`,
			[tierWeight, rarity]
		);
		diceUpdated += result.affectedRows || 0;
	}

	await runQuery(
		`UPDATE loot
     SET weight = 0
     WHERE mechanic = 'equip_dice' AND name = 'Basic Die'`
	);

	console.log(
		`Loot drop weight swap complete (materials → ${materialWeight}, ${materialResult.affectedRows ?? 0} rows; dice tiers → ${diceUpdated} rows).`
	);
	process.exit(0);
}

migrate().catch((error) => {
	console.error('Loot drop weight swap migration failed:', error.message);
	process.exit(1);
});
