const RARITY_TIER_INDEX = {
	Common: 0,
	Uncommon: 1,
	Rare: 2,
	Epic: 3,
	Legendary: 4,
};

/** T0 = best roll band, T4 = worst. Not used for essence items themselves. */
const MAX_MODIFIER_ROLL_TIER = 4;

function normalizeRarityKey(rarity) {
	const key = String(rarity || 'Common');
	if (RARITY_TIER_INDEX[key] !== undefined) return key;
	const normalized = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
	return RARITY_TIER_INDEX[normalized] !== undefined ? normalized : 'Common';
}

function getRarityTierIndex(sourceRarity) {
	return RARITY_TIER_INDEX[normalizeRarityKey(sourceRarity)] ?? 0;
}

function modifierTierFromSourceRarity(sourceRarity) {
	return MAX_MODIFIER_ROLL_TIER - getRarityTierIndex(sourceRarity);
}

function formatModifierTierLabel(tier) {
	const value = Math.max(0, Math.min(MAX_MODIFIER_ROLL_TIER, Number(tier) || 0));
	return `T${value}`;
}

function modifierTierCssKey(tier) {
	return `t${Math.max(0, Math.min(MAX_MODIFIER_ROLL_TIER, Number(tier) || 0))}`;
}

function compareModifierRollTiers(a, b) {
	return Number(a) - Number(b);
}

function isModifierRollTierBetter(candidateTier, existingTier) {
	return compareModifierRollTiers(candidateTier, existingTier) < 0;
}

function formatBetterModifierTierHint(currentTier) {
	const tier = Math.max(0, Math.min(MAX_MODIFIER_ROLL_TIER, Number(currentTier) || 0));
	if (tier <= 0) {
		return 'none (already best tier)';
	}
	return `${formatModifierTierLabel(tier - 1)} or better`;
}

module.exports = {
	MAX_MODIFIER_ROLL_TIER,
	normalizeRarityKey,
	getRarityTierIndex,
	modifierTierFromSourceRarity,
	formatModifierTierLabel,
	modifierTierCssKey,
	compareModifierRollTiers,
	isModifierRollTierBetter,
	formatBetterModifierTierHint,
};
