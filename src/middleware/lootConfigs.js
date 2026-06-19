// lootConfigs.js

const RARITY_TIERS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

function getRarityTierIndex(rarity) {
	const index = RARITY_TIERS.indexOf(rarity);
	return index >= 0 ? index : 0;
}

function getDropWeight(lootItem, itemRarity) {
	const tier = getRarityTierIndex(lootItem.rarity);
	const baseWeight = Math.max(1, Number(lootItem.weight) || 1);
	const rarityScore = Math.max(0, Number(itemRarity) || 0);

	// All tiers stay in the pool at every level. item_rarity only shifts weight toward higher tiers.
	const tierMultiplier =
		tier === 0 ? 1 : 1 + (rarityScore / 100) * Math.pow(2, tier - 1);

	return baseWeight * tierMultiplier;
}

function pickWeightedLoot(lootRows, itemRarity) {
	const weightedLoot = lootRows.map((item) => ({
		item,
		weight: getDropWeight(item, itemRarity),
	}));
	const totalWeight = weightedLoot.reduce((sum, entry) => sum + entry.weight, 0);
	if (totalWeight <= 0) return null;

	const roll = Math.random() * totalWeight;
	let accumulator = 0;

	for (const entry of weightedLoot) {
		accumulator += entry.weight;
		if (roll < accumulator) {
			return entry.item;
		}
	}

	return weightedLoot[weightedLoot.length - 1]?.item || null;
}

// Roll loot directly from a defeated monster's item_quantity and item_rarity stats.
function rollMonsterLoot(lootRows, itemQuantity, itemRarity) {
	if (!lootRows || lootRows.length === 0) {
		return { error: 'No loot data available', items: [] };
	}

	const drops = Math.max(0, Number(itemQuantity) || 0);
	if (drops === 0) {
		return { items: [] };
	}

	const claimedMap = {};

	for (let i = 0; i < drops; i++) {
		const selected = pickWeightedLoot(lootRows, itemRarity);
		if (!selected) continue;

		const key = `${selected.id}-${selected.rarity}`;
		if (!claimedMap[key]) {
			claimedMap[key] = {
				id: selected.id,
				name: selected.name,
				rarity: selected.rarity,
				quantity: 1,
			};
		} else {
			claimedMap[key].quantity += 1;
		}
	}

	return { items: Object.values(claimedMap) };
}

const MONSTER_DICE_DROP_CHANCE = 0.15;

function rollInstanceRarity(itemRarity) {
	const pool = RARITY_TIERS.map((rarity) => ({
		id: rarity,
		rarity,
		weight: 1,
	}));
	const selected = pickWeightedLoot(pool, itemRarity);
	return selected?.rarity || 'Common';
}

function rollMonsterDiceDrop(lootRows, itemRarity = 0) {
	if (Math.random() >= MONSTER_DICE_DROP_CHANCE) {
		return null;
	}

	const dicePool = (lootRows || []).filter(
		(item) => item.mechanic === 'equip_dice' && Math.max(0, Number(item.weight) || 0) > 0
	);
	if (dicePool.length === 0) return null;

	const selected = pickWeightedLoot(dicePool, itemRarity);
	if (!selected) return null;

	return {
		id: selected.id,
		name: selected.name,
		rarity: selected.rarity,
		quantity: 1,
		mechanic: selected.mechanic,
	};
}

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

module.exports = {
	bulkRollLoot,
	insertCallback,
	rollMonsterLoot,
	rollMonsterDiceDrop,
	rollInstanceRarity,
	pickWeightedLoot,
	getDropWeight,
	getRarityTierIndex,
	RARITY_TIERS,
};
