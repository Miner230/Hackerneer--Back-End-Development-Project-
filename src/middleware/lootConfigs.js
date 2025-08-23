// lootConfigs.js


// Rolls multiple loot items based on weighted probabilities.
// Validates user has enough loot shards and reputation before rolling.
// Groups duplicates in the claimed result.
 
function bulkRollLoot(user_data, lootRows, amount) {
	const roll_cost = 150; // Reputation cost per loot shard claimed
	const claimedMap = {};

	// Validation checks
	if (user_data[0].loot_shard < amount) {
		return { error: "You don't have enough loot shards!" };
	}
	if (user_data[0].reputation < roll_cost * amount) {
		return { error: `You need ${roll_cost * amount} reputation to claim ${amount} loot shards.` };
	}
	if (!lootRows || lootRows.length === 0) {
		return { error: 'No loot data available' };
	}

	// Prepare weighted loot table
	const weightedLoot = lootRows.map((item) => ({
		id: item.id,
		name: item.name,
		mechanic: item.mechanic,
		statline: item.statline,
		weight: item.weight,
		rarity: item.rarity,
		item,
	}));
	const totalWeight = weightedLoot.reduce((sum, l) => sum + l.weight, 0);

	// Roll `amount` times using weighted probability
	for (let i = 0; i < amount; i++) {
		const roll = Math.floor(Math.random() * totalWeight);
		let accumulator = 0;
		let selected = null;

		for (let j = 0; j < weightedLoot.length; j++) {
			accumulator += weightedLoot[j].weight;
			if (roll < accumulator) {
				selected = weightedLoot[j];
				break;
			}
		}

		// Track claimed loot, grouping by name & rarity
		if (selected) {
			const key = `${selected.item.name}-${selected.item.rarity}`;
			if (!claimedMap[key]) {
				claimedMap[key] = {
					id: selected.item.id,
					name: selected.item.name,
					rarity: selected.item.rarity,
					quantity: 1,
				};
			} else {
				claimedMap[key].quantity++;
			}
		}
	}

	return {
		claimed: Object.values(claimedMap),
	};
}

// Standardized insert callback for sequential loot insertion.
// Appends inserted item info to `inserted` array and proceeds to next insert. 
function insertCallback({
	error,
	claimed,
	index,
	inserted,
	res,
	insertNext,
}) {
	if (error) {
		console.error('Error inserting loot:', error);
		return res.status(500).json(error);
	}

	const item = claimed[index];
	inserted.push({
		message: `You claimed ${item.name} x${item.quantity}`,
		name: item.name,
		id: item.id,
		rarity: item.rarity,
		quantity: item.quantity,
	});

	insertNext(index + 1); // Move to the next item insert
}

module.exports = { bulkRollLoot, insertCallback };
