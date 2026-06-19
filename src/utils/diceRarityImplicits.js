const { getRarityTierIndex, RARITY_TIERS } = require('../middleware/lootConfigs.js');

const RARITY_TIER_INDEX = {
	Common: 0,
	Uncommon: 1,
	Rare: 2,
	Epic: 3,
	Legendary: 4,
};

const BASIC_DIE_BASELINE = {
	no_of_rolls: 5,
	duplication_chance: 5,
	duplication_number: 1,
	crit_chance: 10,
	crit_power: 200,
	flat_damage: 0,
};

const IMPLICIT_STAT_KEYS = [
	'no_of_rolls',
	'duplication_chance',
	'duplication_number',
	'crit_chance',
	'crit_power',
];

/** Minimum instance rarity required to unlock each implicit on a die type. */
const DICE_IMPLICIT_UNLOCKS = {
	'Basic Die': {
		crit_chance: 'Epic',
		duplication_chance: 'Rare',
		flat_damage: 'Legendary',
	},
	'Crimson Die': {
		crit_chance: 'Common',
		crit_power: 'Uncommon',
		flat_damage: 'Rare',
	},
	'Bone Die': {
		no_of_rolls: 'Common',
		flat_damage: 'Uncommon',
	},
	'Copper Die': {
		duplication_chance: 'Common',
		duplication_number: 'Uncommon',
		flat_damage: 'Rare',
	},
};

function normalizeRarityKey(rarity) {
	const key = String(rarity || 'Common');
	if (RARITY_TIER_INDEX[key] !== undefined) return key;
	const normalized = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
	return RARITY_TIER_INDEX[normalized] !== undefined ? normalized : 'Common';
}

function tierMeetsUnlock(instanceRarity, requiredRarity) {
	const instanceTier = RARITY_TIER_INDEX[normalizeRarityKey(instanceRarity)] ?? 0;
	const requiredTier = RARITY_TIER_INDEX[normalizeRarityKey(requiredRarity)] ?? 0;
	return instanceTier >= requiredTier;
}

/** Same tier curve as loot drop weighting, mapped to 0.4–1.0 implicit strength. */
function getRarityImplicitStrength(instanceRarity, itemRarityScore = 100) {
	const tier = getRarityTierIndex(normalizeRarityKey(instanceRarity));
	const rarityScore = Math.max(0, Number(itemRarityScore) || 0);
	const minStrength = 0.4;

	if (tier <= 0) return minStrength;

	const tierMultiplier = 1 + (rarityScore / 100) * Math.pow(2, tier - 1);
	const legendaryMultiplier = 1 + (rarityScore / 100) * Math.pow(2, RARITY_TIERS.length - 2);

	if (legendaryMultiplier <= 1) return 1;

	const normalized = (tierMultiplier - 1) / (legendaryMultiplier - 1);
	return Math.min(1, minStrength + normalized * (1 - minStrength));
}

function scaleImplicitValue(baseline, fullValue, strength) {
	const base = Number(baseline);
	const full = Number(fullValue);
	if (full === base) return base;
	return Math.round(base + (full - base) * strength);
}

function applyRarityScaledGearStats(source) {
	const dieName = source.name || 'Basic Die';
	const instanceRarity = source.instance_rarity || source.rarity || 'Common';
	const rarityScore = Number(source.drop_rarity_score ?? source.rarity_score ?? 100);
	const unlocks = DICE_IMPLICIT_UNLOCKS[dieName] || {};
	const strength = getRarityImplicitStrength(instanceRarity, rarityScore);

	const scaled = {
		no_of_rolls: BASIC_DIE_BASELINE.no_of_rolls,
		duplication_chance: BASIC_DIE_BASELINE.duplication_chance,
		duplication_number: BASIC_DIE_BASELINE.duplication_number,
		crit_chance: BASIC_DIE_BASELINE.crit_chance,
		crit_power: BASIC_DIE_BASELINE.crit_power,
		base_flat_damage: BASIC_DIE_BASELINE.flat_damage,
	};

	IMPLICIT_STAT_KEYS.forEach((key) => {
		const requiredRarity = unlocks[key];
		const fullValue = Number(source[key] ?? BASIC_DIE_BASELINE[key]);

		if (!requiredRarity || !tierMeetsUnlock(instanceRarity, requiredRarity)) {
			scaled[key] = BASIC_DIE_BASELINE[key];
			return;
		}

		scaled[key] = scaleImplicitValue(BASIC_DIE_BASELINE[key], fullValue, strength);
	});

	const flatRequired = unlocks.flat_damage;
	const fullFlat = Number(source.base_flat_damage ?? source.flat_damage ?? 0);

	if (flatRequired && tierMeetsUnlock(instanceRarity, flatRequired) && fullFlat > 0) {
		scaled.base_flat_damage = Math.max(1, Math.round(fullFlat * strength));
	}

	return scaled;
}

function getUnlockedImplicitKeys(dieName, instanceRarity) {
	const unlocks = DICE_IMPLICIT_UNLOCKS[dieName] || {};
	return Object.entries(unlocks)
		.filter(([, requiredRarity]) => tierMeetsUnlock(instanceRarity, requiredRarity))
		.map(([key]) => key);
}

module.exports = {
	BASIC_DIE_BASELINE,
	DICE_IMPLICIT_UNLOCKS,
	normalizeRarityKey,
	tierMeetsUnlock,
	getRarityImplicitStrength,
	applyRarityScaledGearStats,
	getUnlockedImplicitKeys,
};
