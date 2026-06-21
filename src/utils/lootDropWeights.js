const RARITY_TIERS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

/** Former crafting-material drop weights (now used for dice). */
const TIER_DROP_WEIGHTS = {
	Common: 200,
	Uncommon: 100,
	Rare: 50,
	Epic: 10,
	Legendary: 1,
};

/** Former dice drop weight (now used for crafting materials). */
const CRAFTING_MATERIAL_DROP_WEIGHT = 12;

function normalizeRarityKey(rarity) {
	const key = String(rarity || 'Common');
	if (TIER_DROP_WEIGHTS[key] !== undefined) return key;
	const normalized = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
	return TIER_DROP_WEIGHTS[normalized] !== undefined ? normalized : 'Common';
}

function getTierDropWeight(rarity) {
	return TIER_DROP_WEIGHTS[normalizeRarityKey(rarity)] ?? TIER_DROP_WEIGHTS.Common;
}

function getCraftingMaterialDropWeight() {
	return CRAFTING_MATERIAL_DROP_WEIGHT;
}

module.exports = {
	RARITY_TIERS,
	TIER_DROP_WEIGHTS,
	CRAFTING_MATERIAL_DROP_WEIGHT,
	getTierDropWeight,
	getCraftingMaterialDropWeight,
	normalizeRarityKey,
};
