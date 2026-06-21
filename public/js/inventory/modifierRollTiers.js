const MODIFIER_RARITY_TIER_INDEX = {
	Common: 0,
	Uncommon: 1,
	Rare: 2,
	Epic: 3,
	Legendary: 4,
};

const MAX_MODIFIER_ROLL_TIER = 4;

function normalizeModifierRarityKey(rarity) {
	const key = String(rarity || 'Common');
	if (MODIFIER_RARITY_TIER_INDEX[key] !== undefined) return key;
	const normalized = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
	return MODIFIER_RARITY_TIER_INDEX[normalized] !== undefined ? normalized : 'Common';
}

function getModifierRollTier(sourceRarity) {
	const rarityIndex = MODIFIER_RARITY_TIER_INDEX[normalizeModifierRarityKey(sourceRarity)] ?? 0;
	return MAX_MODIFIER_ROLL_TIER - rarityIndex;
}

function getModifierRollTierFromModifier(modifier) {
	if (modifier?.roll_tier != null) {
		return Math.max(0, Math.min(MAX_MODIFIER_ROLL_TIER, Number(modifier.roll_tier) || 0));
	}
	if (modifier?.rt != null) {
		return Math.max(0, Math.min(MAX_MODIFIER_ROLL_TIER, Number(modifier.rt) || 0));
	}
	return getModifierRollTier(modifier?.source_rarity);
}

function formatModifierTierLabel(tier) {
	const value = Math.max(0, Math.min(MAX_MODIFIER_ROLL_TIER, Number(tier) || 0));
	return `T${value}`;
}

function getModifierTierCssKey(tier) {
	return `t${Math.max(0, Math.min(MAX_MODIFIER_ROLL_TIER, Number(tier) || 0))}`;
}

function formatModifierTierBadge(tier, options = {}) {
	const label = formatModifierTierLabel(tier);
	const quality =
		Number(tier) <= 0 ? 'best' : Number(tier) >= MAX_MODIFIER_ROLL_TIER ? 'worst' : 'mid';
	const title =
		options.title ||
		`Modifier tier ${label} (${quality === 'best' ? 'strongest band' : quality === 'worst' ? 'weakest band' : 'mid band'})`;
	return `<span class="affix-tier-badge affix-tier-badge--${getModifierTierCssKey(tier)}" title="${title}">${label}</span>`;
}

window.getModifierRollTier = getModifierRollTier;
window.getModifierRollTierFromModifier = getModifierRollTierFromModifier;
window.formatModifierTierLabel = formatModifierTierLabel;
window.getModifierTierCssKey = getModifierTierCssKey;
window.formatModifierTierBadge = formatModifierTierBadge;
