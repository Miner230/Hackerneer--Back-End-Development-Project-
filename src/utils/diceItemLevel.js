function randomInt(min, max) {
	const low = Math.min(min, max);
	const high = Math.max(min, max);
	return Math.floor(Math.random() * (high - low + 1)) + low;
}

function rollDiceItemLevel(monsterLevel) {
	const level = Math.max(1, Number(monsterLevel) || 1);
	return Math.max(1, level + randomInt(-3, 3));
}

function computeGearFlatDamageRange(baseFlatDamage = 0, itemLevel = 1) {
	const base = Math.max(0, Number(baseFlatDamage) || 0);
	const level = Math.max(1, Number(itemLevel) || 1);
	return {
		min: level + base,
		max: level * 5 + base,
	};
}

/** @deprecated use computeGearFlatDamageRange */
function computeEffectiveFlatDamage(baseFlatDamage, itemLevel = 1) {
	const { max } = computeGearFlatDamageRange(baseFlatDamage, itemLevel);
	return max;
}

module.exports = {
	rollDiceItemLevel,
	computeGearFlatDamageRange,
	computeEffectiveFlatDamage,
};
