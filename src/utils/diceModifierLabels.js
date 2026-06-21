const { getModifierDisplayName } = require('./diceEssenceCraft.js');

const MODIFIER_SOURCE = {
	CRAFTED: 'crafted',
	INTRINSIC: 'intrinsic',
};

function getModifierAffixSublabel(modifier) {
	if (!modifier) return '';

	if (modifier.source_kind === MODIFIER_SOURCE.INTRINSIC) {
		return modifier.modifier_name || getModifierDisplayName(modifier.essence_mechanic);
	}

	if (modifier.source_kind === MODIFIER_SOURCE.CRAFTED) {
		return modifier.source_name || modifier.modifier_name || '';
	}

	return modifier.modifier_name || getModifierDisplayName(modifier.essence_mechanic);
}

function isCraftedEssenceModifier(modifier) {
	return modifier?.source_kind === MODIFIER_SOURCE.CRAFTED;
}

function isIntrinsicDropModifier(modifier) {
	return modifier?.source_kind === MODIFIER_SOURCE.INTRINSIC;
}

module.exports = {
	MODIFIER_SOURCE,
	getModifierAffixSublabel,
	isCraftedEssenceModifier,
	isIntrinsicDropModifier,
};
