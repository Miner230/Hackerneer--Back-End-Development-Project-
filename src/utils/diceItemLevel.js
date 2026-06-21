/** Baseline flat-damage spread: min is (1 - spread) of max. */
const GEAR_FLAT_SPREAD = 0.2;

/** Level-1 baseline cap — floor stays low on early drops. */
const GEAR_FLAT_MAX_AT_L1 = 2;

/** Reference high-end cap at level 100 (before family base bonus). */
const GEAR_FLAT_MAX_AT_REF = 1292;
const GEAR_FLAT_REF_LEVEL = 100;

/** Per-instance max jitter around the level curve (±11%). */
const GEAR_FLAT_JITTER = 0.22;

function randomInt(min, max) {
	const low = Math.min(min, max);
	const high = Math.max(min, max);
	return Math.floor(Math.random() * (high - low + 1)) + low;
}

function hashSeed(seed, salt = '') {
	const text = `${seed}:${salt}`;
	let hash = 2166136261;

	for (let i = 0; i < text.length; i += 1) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}

function seededUnit(seed, salt = 'flat') {
	return hashSeed(seed, salt) / 0xffffffff;
}

function rollDiceItemLevel(monsterLevel) {
	const level = Math.max(1, Number(monsterLevel) || 1);
	return Math.max(1, level + randomInt(-3, 3));
}

function parseSnapshotObject(raw) {
	if (!raw) return null;
	if (typeof raw === 'object') return raw;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function getPersistedGearFlatRange(dieRow) {
	const snapshot = parseSnapshotObject(dieRow?.stats_snapshot);
	if (snapshot?.gf?.min == null || snapshot?.gf?.max == null) {
		return null;
	}

	const min = Math.max(0, Number(snapshot.gf.min) || 0);
	const max = Math.max(min, Number(snapshot.gf.max) || min);
	return { min, max };
}

function expectedGearFlatMax(itemLevel) {
	const level = Math.max(1, Number(itemLevel) || 1);
	if (level <= 1) {
		return GEAR_FLAT_MAX_AT_L1;
	}

	const slope = (GEAR_FLAT_MAX_AT_REF - GEAR_FLAT_MAX_AT_L1) / (GEAR_FLAT_REF_LEVEL - 1);
	return GEAR_FLAT_MAX_AT_L1 + slope * (level - 1);
}

function rollGearFlatDamageRange(baseFlatDamage = 0, itemLevel = 1, instanceId = null) {
	const base = Math.max(0, Number(baseFlatDamage) || 0);
	const level = Math.max(1, Number(itemLevel) || 1);

	if (level <= 1) {
		return {
			min: 1 + base,
			max: GEAR_FLAT_MAX_AT_L1 + base,
		};
	}

	const expectedMax = expectedGearFlatMax(level);
	const jitterSpan = GEAR_FLAT_JITTER / 2;
	const jitter =
		instanceId != null
			? 1 - jitterSpan + seededUnit(instanceId, 'gearFlatMax') * GEAR_FLAT_JITTER
			: 1 - jitterSpan + Math.random() * GEAR_FLAT_JITTER;

	let max = Math.max(1, Math.round(expectedMax * jitter));
	let min = Math.max(1, Math.floor(max * (1 - GEAR_FLAT_SPREAD)));

	if (min > max) {
		min = max;
	}

	return {
		min: min + base,
		max: max + base,
	};
}

function resolveGearFlatDamageRange(dieRow) {
	const persisted = getPersistedGearFlatRange(dieRow);
	if (persisted) {
		return persisted;
	}

	const baseFlatDamage = Math.max(
		0,
		Number(dieRow?.base_flat_damage ?? dieRow?.flat_damage) || 0
	);
	const itemLevel = Math.max(1, Number(dieRow?.item_level) || 1);
	const instanceId = dieRow?.id ?? dieRow?.dice_instance_id ?? null;

	return rollGearFlatDamageRange(baseFlatDamage, itemLevel, instanceId);
}

/** @deprecated use resolveGearFlatDamageRange */
function computeGearFlatDamageRange(baseFlatDamage = 0, itemLevel = 1) {
	return rollGearFlatDamageRange(baseFlatDamage, itemLevel, null);
}

/** @deprecated use resolveGearFlatDamageRange */
function computeEffectiveFlatDamage(baseFlatDamage, itemLevel = 1) {
	const { max } = rollGearFlatDamageRange(baseFlatDamage, itemLevel, null);
	return max;
}

module.exports = {
	GEAR_FLAT_SPREAD,
	rollDiceItemLevel,
	expectedGearFlatMax,
	rollGearFlatDamageRange,
	resolveGearFlatDamageRange,
	getPersistedGearFlatRange,
	computeGearFlatDamageRange,
	computeEffectiveFlatDamage,
};
