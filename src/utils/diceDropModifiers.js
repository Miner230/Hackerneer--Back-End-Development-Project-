const { getDiceFamiliesForDrops } = require('./diceTierDefinitions.js');
const {
	MAX_PREFIXES,
	MAX_SUFFIXES,
	CRAFTABLE_MECHANICS,
	MAX_FLAT_DAMAGE_PERCENT,
	getEssenceFamily,
	getAffixType,
	getModifierDisplayName,
	getModifierRollRange,
	normalizeRarityKey,
} = require('./diceEssenceCraft.js');
const { modifierTierFromSourceRarity } = require('./modifierRollTiers.js');

const RARITY_TIERS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

const RARITY_TIER_INDEX = {
	Common: 0,
	Uncommon: 1,
	Rare: 2,
	Epic: 3,
	Legendary: 4,
};

const MODIFIER_COUNT_BY_DICE_RARITY = {
	Common: 1,
	Uncommon: 2,
	Rare: 3,
	Epic: 4,
	Legendary: 6,
};

/** Minimum affix count required for each dice rarity tier (inverse of drop table). */
const DICE_RARITY_BY_MODIFIER_COUNT = [
	{ minModifiers: 6, rarity: 'Legendary' },
	{ minModifiers: 4, rarity: 'Epic' },
	{ minModifiers: 3, rarity: 'Rare' },
	{ minModifiers: 2, rarity: 'Uncommon' },
	{ minModifiers: 0, rarity: 'Common' },
];

/** Drop rolls use the upper band of each essence tier's range (stronger than crafted essences). */
const DROP_VALUE_FLOOR = 0.65;

function randomInt(min, max) {
	const low = Math.min(min, max);
	const high = Math.max(min, max);
	return Math.floor(Math.random() * (high - low + 1)) + low;
}

function shuffleArray(items) {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function monsterItemRarityToDiceTier(itemRarity) {
	const score = Math.max(0, Number(itemRarity) || 0);
	if (score >= 80) return 'Legendary';
	if (score >= 60) return 'Epic';
	if (score >= 40) return 'Rare';
	if (score >= 22) return 'Uncommon';
	return 'Common';
}

function getModifierCountForDiceRarity(diceRarity) {
	return MODIFIER_COUNT_BY_DICE_RARITY[normalizeRarityKey(diceRarity)] ?? 1;
}

function getDiceRarityForModifierCount(modifierCount) {
	const count = Math.max(0, Number(modifierCount) || 0);
	for (const entry of DICE_RARITY_BY_MODIFIER_COUNT) {
		if (count >= entry.minModifiers) {
			return entry.rarity;
		}
	}
	return 'Common';
}

function compareRarityTier(a, b) {
	return (RARITY_TIER_INDEX[normalizeRarityKey(a)] ?? 0) - (RARITY_TIER_INDEX[normalizeRarityKey(b)] ?? 0);
}

function maxRarityTier(a, b) {
	return compareRarityTier(a, b) >= 0 ? normalizeRarityKey(a) : normalizeRarityKey(b);
}

function rollRandomModifierTierRarity() {
	return RARITY_TIERS[randomInt(0, RARITY_TIERS.length - 1)];
}

function findEssenceLootRow(lootRows, mechanic, modifierTierRarity) {
	const tier = normalizeRarityKey(modifierTierRarity);
	return (
		(lootRows || []).find((row) => row.mechanic === mechanic && row.rarity === tier) ||
		(lootRows || []).find((row) => row.mechanic === mechanic) ||
		null
	);
}

function rollDropModifierValue(mechanic, modifierTierRarity, lootRows) {
	const essenceRow = findEssenceLootRow(lootRows, mechanic, modifierTierRarity);
	if (!essenceRow) return 1;

	const { min, max } = getModifierRollRange(essenceRow);
	const dropMin = Math.max(min, Math.floor(min + (max - min) * DROP_VALUE_FLOOR));
	let value = randomInt(dropMin, max);

	if (mechanic === 'dice_flat_damage_percent') {
		value = Math.min(MAX_FLAT_DAMAGE_PERCENT, value);
	}

	return value;
}

function rollDropModifiers(modifierCount, lootRows) {
	const targetCount = Math.max(0, Math.min(MAX_PREFIXES + MAX_SUFFIXES, Number(modifierCount) || 0));
	if (targetCount <= 0) return [];

	const mechanics = shuffleArray([...CRAFTABLE_MECHANICS]);
	const modifiers = [];
	const usedFamilies = new Set();
	let prefixCount = 0;
	let suffixCount = 0;

	for (const mechanic of mechanics) {
		if (modifiers.length >= targetCount) break;

		const family = getEssenceFamily(mechanic);
		if (usedFamilies.has(family)) continue;

		const affixType = getAffixType(mechanic);
		if (affixType === 'prefix' && prefixCount >= MAX_PREFIXES) continue;
		if (affixType === 'suffix' && suffixCount >= MAX_SUFFIXES) continue;

		const modifierTierRarity = rollRandomModifierTierRarity();
		const essenceRow = findEssenceLootRow(lootRows, mechanic, modifierTierRarity);
		if (!essenceRow) continue;

		const rolledValue = rollDropModifierValue(mechanic, modifierTierRarity, lootRows);

		modifiers.push({
			affixType,
			slotIndex: modifiers.length,
			essenceMechanic: mechanic,
			essenceFamily: family,
			modifierName: getModifierDisplayName(mechanic),
			rolledValue,
			sourceLootId: essenceRow.id,
			sourceRarity: normalizeRarityKey(modifierTierRarity),
			rollTier: modifierTierFromSourceRarity(modifierTierRarity),
		});

		usedFamilies.add(family);
		if (affixType === 'prefix') prefixCount += 1;
		else suffixCount += 1;
	}

	return modifiers;
}

function pickRandomDiceFamily(lootRows) {
	const families = getDiceFamiliesForDrops();
	const familySet = new Set(families);
	const pool = (lootRows || []).filter(
		(item) =>
			item.mechanic === 'equip_dice' &&
			familySet.has(item.name) &&
			Math.max(0, Number(item.weight) || 0) > 0
	);

	const byFamily = new Map();
	pool.forEach((item) => {
		if (!byFamily.has(item.name)) byFamily.set(item.name, item);
	});

	const uniqueFamilies = [...byFamily.values()];
	if (!uniqueFamilies.length) return null;

	return uniqueFamilies[randomInt(0, uniqueFamilies.length - 1)];
}

function resolveDiceLootId(lootRows, familyName, instanceRarity) {
	const tier = normalizeRarityKey(instanceRarity);
	const familyRows = (lootRows || []).filter(
		(row) => row.mechanic === 'equip_dice' && row.name === familyName
	);
	if (!familyRows.length) return null;

	const rowForTier = (targetTier) =>
		familyRows.find((row) => normalizeRarityKey(row.rarity) === targetTier);

	const exact = rowForTier(tier);
	if (exact) return exact.id;

	const targetIndex = RARITY_TIER_INDEX[tier] ?? 0;

	for (let index = targetIndex; index >= 0; index -= 1) {
		const match = rowForTier(RARITY_TIERS[index]);
		if (match) return match.id;
	}

	for (let index = targetIndex + 1; index < RARITY_TIERS.length; index += 1) {
		const match = rowForTier(RARITY_TIERS[index]);
		if (match) return match.id;
	}

	return familyRows[0]?.id ?? null;
}

module.exports = {
	RARITY_TIERS,
	MODIFIER_COUNT_BY_DICE_RARITY,
	monsterItemRarityToDiceTier,
	getModifierCountForDiceRarity,
	getDiceRarityForModifierCount,
	maxRarityTier,
	compareRarityTier,
	rollDropModifiers,
	pickRandomDiceFamily,
	resolveDiceLootId,
	rollDropModifierValue,
};
