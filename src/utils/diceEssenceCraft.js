const { DEFAULT_DICE_STATS } = require('../models/diceModel.js');
const { computeGearFlatDamageRange } = require('./diceItemLevel.js');
const { applyRarityScaledGearStats, BASIC_DIE_BASELINE: RARITY_BASELINE } = require('./diceRarityImplicits.js');

const MAX_PREFIXES = 3;
const MAX_SUFFIXES = 3;
const MAX_DICE_MODIFIERS = MAX_PREFIXES + MAX_SUFFIXES;

const RARITY_TIER_INDEX = {
	Common: 0,
	Uncommon: 1,
	Rare: 2,
	Epic: 3,
	Legendary: 4,
};

const ESSENCE_META = {
	crit_chance: { family: 'fear', affixType: 'suffix', prefix: 'Dreadful', suffix: 'of Dread' },
	crit_power: { family: 'chase', affixType: 'suffix', prefix: 'Chase-Touched', suffix: 'of the Chase' },
	duplication_chance: { family: 'mind', affixType: 'suffix', prefix: 'Mindful', suffix: 'of the Mind' },
	duplication_number: { family: 'echoing', affixType: 'suffix', prefix: 'Echoing', suffix: 'of Echoes' },
	dice_flat_damage_percent: {
		family: 'might',
		affixType: 'prefix',
		prefix: 'Mighty',
		suffix: 'of Might',
	},
	dice_flat_damage_roll: {
		family: 'edge',
		affixType: 'prefix',
		prefix: 'Edged',
		suffix: 'of the Edge',
	},
	face_1: { family: 'face_1', affixType: 'prefix', prefix: 'Weighted I', suffix: 'of the First Face' },
	face_2: { family: 'face_2', affixType: 'prefix', prefix: 'Weighted II', suffix: 'of the Second Face' },
	face_3: { family: 'face_3', affixType: 'prefix', prefix: 'Weighted III', suffix: 'of the Third Face' },
	face_4: { family: 'face_4', affixType: 'prefix', prefix: 'Weighted IV', suffix: 'of the Fourth Face' },
	face_5: { family: 'face_5', affixType: 'prefix', prefix: 'Weighted V', suffix: 'of the Fifth Face' },
	face_6: { family: 'face_6', affixType: 'prefix', prefix: 'Weighted VI', suffix: 'of the Sixth Face' },
	player_flat_health: { family: 'vigor', affixType: 'suffix', prefix: 'Vigorous', suffix: 'of Vigor' },
	player_max_health_percent: {
		family: 'fortitude',
		affixType: 'suffix',
		prefix: 'Fortified',
		suffix: 'of Fortitude',
	},
	damage_reduction_penetration: {
		family: 'sunder',
		affixType: 'prefix',
		prefix: 'Sundering',
		suffix: 'of Sunder',
	},
	player_life_regen: { family: 'renewal', affixType: 'suffix', prefix: 'Renewing', suffix: 'of Renewal' },
	player_speed_bonus: { family: 'haste', affixType: 'suffix', prefix: 'Hasty', suffix: 'of the Haste' },
};

const BASIC_DIE_BASELINE = {
	no_of_rolls: 5,
	duplication_chance: 5,
	duplication_number: 1,
	crit_chance: 10,
	crit_power: 200,
	flat_damage: 0,
};

const MAX_FLAT_DAMAGE_PERCENT = 200;

const EDGE_FLAT_DAMAGE_RANGES = {
	Common: { min: 1, max: 3 },
	Uncommon: { min: 1, max: 6 },
	Rare: { min: 5, max: 15 },
	Epic: { min: 20, max: 60 },
	Legendary: { min: 130, max: 150 },
};

function normalizeRarityKey(rarity) {
	const key = String(rarity || 'Common');
	return (
		RARITY_TIER_INDEX[key] !== undefined
			? key
			: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()
	);
}

function getEdgeFlatDamageRange(rarity) {
	const key = normalizeRarityKey(rarity);
	return EDGE_FLAT_DAMAGE_RANGES[key] || EDGE_FLAT_DAMAGE_RANGES.Common;
}

function formatFlatDamageRange(min, max) {
	const low = Number(min || 0);
	const high = Number(max || 0);
	if (high <= 0) return '0';
	return `+${low}-${high}`;
}

function getCombinedFlatDamagePerRoll(stats) {
	const gearMin = Number(stats?.flat_damage_min || 0);
	const gearMax = Number(stats?.flat_damage_max || 0);
	const edgeMin = Number(stats?.flat_damage_roll_min || 0);
	const edgeMax = Number(stats?.flat_damage_roll_max || 0);

	return {
		min: gearMin + edgeMin,
		max: gearMax + edgeMax,
	};
}

const IMPLICIT_STAT_DEFS = [
	{
		key: 'flat_damage',
		label: 'Flat Damage',
		format: (_value, stats) =>
			`${formatFlatDamageRange(stats.flat_damage_min, stats.flat_damage_max)} per roll`,
	},
	{ key: 'crit_chance', label: 'Critical Chance', format: (value) => `${value}%` },
	{ key: 'crit_power', label: 'Critical Power', format: (value) => `${value}%` },
	{ key: 'no_of_rolls', label: 'Rolls per Attack', format: (value) => String(value) },
	{ key: 'duplication_chance', label: 'Duplication Chance', format: (value) => `${value}%` },
	{ key: 'duplication_number', label: 'Duplication Number', format: (value) => String(value) },
];

const EFFECTIVE_STAT_DEFS = [
	{ key: 'crit_chance', label: 'Critical Chance' },
	{ key: 'crit_power', label: 'Critical Power' },
	{ key: 'duplication_chance', label: 'Duplication Chance' },
	{ key: 'duplication_number', label: 'Duplication Number' },
	{ key: 'flat_damage_percent', label: 'Increased Flat Damage' },
	{ key: 'no_of_rolls', label: 'Rolls per Attack' },
];

const CORE_EFFECTIVE_STAT_KEYS = new Set([
	'crit_chance',
	'crit_power',
	'duplication_chance',
	'duplication_number',
	'no_of_rolls',
]);

const PLAYER_EFFECTIVE_STAT_DEFS = [
	{ key: 'player_flat_health', label: 'Max Health' },
	{ key: 'player_max_health_percent', label: 'Max Health %' },
	{ key: 'damage_reduction_penetration', label: 'DR Penetration' },
	{ key: 'player_life_regen', label: 'Life Regen' },
	{ key: 'player_speed_bonus', label: 'Combat Speed' },
];

function formatEffectiveStatValue(key, value) {
	const amount = Number(value || 0);
	if (key === 'flat_damage_percent') {
		return `${amount}%`;
	}
	if (key === 'crit_chance' || key === 'crit_power' || key === 'duplication_chance') {
		return `${amount}%`;
	}
	return String(amount);
}

function formatPlayerEffectiveStatValue(key, value) {
	const amount = Number(value || 0);
	if (key === 'player_max_health_percent') {
		return `+${amount}%`;
	}
	return `+${amount}`;
}

function shouldIncludeEffectiveStat(key, value) {
	if (CORE_EFFECTIVE_STAT_KEYS.has(key)) {
		return true;
	}
	return Number(value || 0) > 0;
}

function buildEffectiveStatRows(stats, playerBonuses = {}) {
	if (!stats) return [];

	const rows = EFFECTIVE_STAT_DEFS.filter((def) =>
		shouldIncludeEffectiveStat(def.key, stats[def.key])
	).map((def) => ({
		key: def.key,
		label: def.label,
		value: Number(stats[def.key] ?? 0),
		display: formatEffectiveStatValue(def.key, stats[def.key]),
	}));

	const combinedFlat = getCombinedFlatDamagePerRoll(stats);
	if (combinedFlat.max > 0) {
		rows.splice(4, 0, {
			key: 'flat_damage_per_roll',
			label: 'Flat Damage per Roll',
			value: combinedFlat.max,
			display: formatFlatDamageRange(combinedFlat.min, combinedFlat.max),
		});
	}

	for (let side = 1; side <= 6; side += 1) {
		const key = `side_${side}`;
		const value = Number(stats[key] ?? 10);
		if (value !== 10) {
			rows.push({
				key,
				label: `Side ${side} Weight`,
				value,
				display: String(value),
			});
		}
	}

	PLAYER_EFFECTIVE_STAT_DEFS.forEach((def) => {
		const value = Number(playerBonuses[def.key] ?? 0);
		if (value <= 0) return;

		rows.push({
			key: def.key,
			label: def.label,
			value,
			display: formatPlayerEffectiveStatValue(def.key, value),
		});
	});

	return rows;
}

const DICE_STAT_MECHANICS = new Set([
	'crit_chance',
	'crit_power',
	'duplication_chance',
	'duplication_number',
	'dice_flat_damage_percent',
	'dice_flat_damage_roll',
]);

const { isSocketableMechanic } = require('./diceSockets.js');

const PLAYER_STAT_MECHANICS = new Set([
	'player_flat_health',
	'player_max_health_percent',
	'damage_reduction_penetration',
	'player_life_regen',
	'player_speed_bonus',
]);

const CRAFTABLE_MECHANICS = new Set([...DICE_STAT_MECHANICS, ...PLAYER_STAT_MECHANICS]);

function isCraftableMechanic(mechanic) {
	return CRAFTABLE_MECHANICS.has(mechanic) && !isSocketableMechanic(mechanic);
}

function isEssenceAffixModifier(modifier) {
	return modifier?.essence_mechanic && !isSocketableMechanic(modifier.essence_mechanic);
}

function applyFaceWeightBonuses(stats, sources = []) {
	sources.forEach((source) => {
		const mechanic = source.essence_mechanic || source.mechanic;
		const value = Number(source.rolled_value || 0);
		if (!mechanic?.startsWith('face_') || !value) return;
		const sideKey = mechanic.replace('face_', 'side_');
		stats[sideKey] = (stats[sideKey] || 0) + value;
	});
}

function getEssenceFamily(mechanic) {
	return ESSENCE_META[mechanic]?.family || mechanic;
}

function getAffixType(mechanic) {
	return ESSENCE_META[mechanic]?.affixType || 'suffix';
}

function getModifierDisplayName(mechanic) {
	const meta = ESSENCE_META[mechanic];
	if (!meta) return `of ${mechanic.replace(/_/g, ' ')}`;
	return meta.affixType === 'prefix' ? meta.prefix : meta.suffix;
}

function getModifierSuffix(mechanic) {
	return getModifierDisplayName(mechanic);
}

function randomInt(min, max) {
	const low = Math.min(min, max);
	const high = Math.max(min, max);
	return Math.floor(Math.random() * (high - low + 1)) + low;
}

const ESSENCE_STATLINE_MULTIPLIER = 3;

function getEffectiveCraftStatline(lootItem) {
	const base = Math.max(1, Number(lootItem?.statline) || 1);
	if (isCraftableMechanic(lootItem?.mechanic)) {
		return Math.max(1, Math.floor(base * ESSENCE_STATLINE_MULTIPLIER));
	}
	return base;
}

function getModifierRollRange(lootItem) {
	if (lootItem?.mechanic === 'dice_flat_damage_roll') {
		return getEdgeFlatDamageRange(lootItem.rarity);
	}

	const statline = getEffectiveCraftStatline(lootItem);
	const rarityKey = normalizeRarityKey(lootItem?.rarity);
	const tier = RARITY_TIER_INDEX[rarityKey] ?? 0;
	const min = Math.max(1, Math.floor(statline * (0.35 + tier * 0.13)));
	return { min, max: statline };
}

function rollModifierValue(lootItem) {
	const { min, max } = getModifierRollRange(lootItem);
	let value = randomInt(min, max);
	if (lootItem?.mechanic === 'dice_flat_damage_percent') {
		value = Math.min(MAX_FLAT_DAMAGE_PERCENT, value);
	}
	return value;
}

function formatEdgeModifierDisplay(modifier) {
	const range = getEdgeFlatDamageRange(modifier?.source_rarity);
	return formatFlatDamageRange(range.min, range.max);
}

function formatCraftedModifierDisplay(modifier) {
	if (modifier?.essence_mechanic === 'dice_flat_damage_percent') {
		return `+${modifier.rolled_value}%`;
	}
	if (modifier?.essence_mechanic === 'dice_flat_damage_roll') {
		return formatEdgeModifierDisplay(modifier);
	}
	return `+${modifier.rolled_value}`;
}

function getRarityTier(rarity) {
	const rarityKey = String(rarity || 'Common');
	return (
		RARITY_TIER_INDEX[rarityKey] ??
		RARITY_TIER_INDEX[rarityKey.charAt(0).toUpperCase() + rarityKey.slice(1).toLowerCase()] ??
		0
	);
}

function evaluateEssenceCraftAction(existingModifier, essence) {
	if (!existingModifier) {
		return { action: 'insert' };
	}

	const existingTier = getRarityTier(existingModifier.source_rarity);
	const newTier = getRarityTier(essence.rarity);

	if (newTier === existingTier) {
		return {
			action: 'reject',
			message: `A ${essence.rarity} essence cannot reroll this modifier. Use a higher tier essence to upgrade it.`,
		};
	}

	if (newTier < existingTier) {
		return {
			action: 'reject',
			message: `This modifier was crafted with a higher tier essence. Use a higher tier essence to upgrade it.`,
		};
	}

	return { action: 'upgrade', modifierId: existingModifier.id };
}

function sumModifierValues(modifiers, mechanic) {
	return (modifiers || []).reduce(
		(sum, modifier) =>
			modifier.essence_mechanic === mechanic ? sum + Number(modifier.rolled_value || 0) : sum,
		0
	);
}

function buildBaseGearStats(gear) {
	const source = gear || DEFAULT_DICE_STATS;
	const itemLevel = Number(source.item_level ?? 1);
	const rarityScaled = applyRarityScaledGearStats(source);
	const baseFlatDamage = Number(rarityScaled.base_flat_damage ?? 0);
	const gearFlat = computeGearFlatDamageRange(baseFlatDamage, itemLevel);

	return {
		side_1: Number(source.side_1 ?? DEFAULT_DICE_STATS.side_1),
		side_2: Number(source.side_2 ?? DEFAULT_DICE_STATS.side_2),
		side_3: Number(source.side_3 ?? DEFAULT_DICE_STATS.side_3),
		side_4: Number(source.side_4 ?? DEFAULT_DICE_STATS.side_4),
		side_5: Number(source.side_5 ?? DEFAULT_DICE_STATS.side_5),
		side_6: Number(source.side_6 ?? DEFAULT_DICE_STATS.side_6),
		no_of_rolls: Number(rarityScaled.no_of_rolls ?? DEFAULT_DICE_STATS.no_of_rolls),
		duplication_chance: Number(rarityScaled.duplication_chance ?? DEFAULT_DICE_STATS.duplication_chance),
		duplication_number: Number(rarityScaled.duplication_number ?? DEFAULT_DICE_STATS.duplication_number),
		crit_chance: Number(rarityScaled.crit_chance ?? DEFAULT_DICE_STATS.crit_chance),
		crit_power: Number(rarityScaled.crit_power ?? DEFAULT_DICE_STATS.crit_power),
		item_level: itemLevel,
		instance_rarity: source.instance_rarity || source.rarity || 'Common',
		base_flat_damage: baseFlatDamage,
		flat_damage_min: gearFlat.min,
		flat_damage_max: gearFlat.max,
		flat_damage: gearFlat.max,
		flat_damage_percent: 0,
		flat_damage_roll_min: 0,
		flat_damage_roll_max: 0,
	};
}

function buildImplicitModifiers(gear) {
	const stats = buildBaseGearStats(gear);
	const baseFlatDamage = Number(stats.base_flat_damage || 0);
	const baseline = RARITY_BASELINE;

	return IMPLICIT_STAT_DEFS.filter((def) => {
		if (def.key === 'flat_damage') {
			return baseFlatDamage > baseline.flat_damage;
		}

		return Number(stats[def.key]) !== Number(baseline[def.key]);
	}).map((def) => ({
		key: def.key,
		label: def.label,
		value: Number(stats[def.key]),
		display: def.format(Number(stats[def.key]), stats),
	}));
}

function computeEffectiveDiceStats(baseGear, modifiers = [], sockets = []) {
	const stats = buildBaseGearStats(baseGear);

	applyFaceWeightBonuses(stats, modifiers);
	applyFaceWeightBonuses(stats, sockets);

	modifiers.forEach((modifier) => {
		const mechanic = modifier.essence_mechanic;
		const value = Number(modifier.rolled_value || 0);
		if (isSocketableMechanic(mechanic)) return;

		if (mechanic === 'dice_flat_damage_percent') {
			if (!value) return;
			stats.flat_damage_percent = Math.min(
				MAX_FLAT_DAMAGE_PERCENT,
				(stats.flat_damage_percent || 0) + value
			);
			return;
		}

		if (mechanic === 'dice_flat_damage_roll') {
			const range = getEdgeFlatDamageRange(modifier.source_rarity);
			stats.flat_damage_roll_min = range.min;
			stats.flat_damage_roll_max = range.max;
			return;
		}

		if (!value) return;

		if (DICE_STAT_MECHANICS.has(mechanic)) {
			stats[mechanic] = (stats[mechanic] || 0) + value;
		}
	});

	return stats;
}

function computePlayerBonusesFromModifiers(modifiers = []) {
	return {
		player_flat_health: sumModifierValues(modifiers, 'player_flat_health'),
		player_max_health_percent: sumModifierValues(modifiers, 'player_max_health_percent'),
		damage_reduction_penetration: sumModifierValues(modifiers, 'damage_reduction_penetration'),
		player_life_regen: sumModifierValues(modifiers, 'player_life_regen'),
		player_speed_bonus: sumModifierValues(modifiers, 'player_speed_bonus'),
	};
}

function buildCraftedDiceName(baseName, modifiers = []) {
	const essenceModifiers = (modifiers || []).filter(isEssenceAffixModifier);
	if (!essenceModifiers.length) return baseName;

	const prefixes = essenceModifiers
		.filter((modifier) => modifier.affix_type === 'prefix')
		.map((modifier) => modifier.modifier_name || getModifierDisplayName(modifier.essence_mechanic));

	const suffixes = essenceModifiers
		.filter((modifier) => modifier.affix_type === 'suffix')
		.map((modifier) => modifier.modifier_name || getModifierDisplayName(modifier.essence_mechanic));

	const prefixText = prefixes.length ? `${prefixes.join(' ')} ` : '';
	const suffixText = suffixes.length ? ` ${suffixes.join(' ')}` : '';

	return `${prefixText}${baseName}${suffixText}`.trim();
}

function countAffixes(modifiers, affixType) {
	return (modifiers || []).filter((modifier) => modifier.affix_type === affixType).length;
}

function formatModifierRow(row) {
	return {
		id: row.id,
		affix_type: getAffixType(row.essence_mechanic) || row.affix_type,
		dice_instance_id: row.dice_instance_id,
		essence_mechanic: row.essence_mechanic,
		essence_family: row.essence_family || getEssenceFamily(row.essence_mechanic),
		modifier_name: row.modifier_name,
		rolled_value: row.rolled_value,
		source_loot_id: row.source_loot_id,
		source_rarity: row.source_rarity,
		source_name: row.source_name,
	};
}

module.exports = {
	MAX_PREFIXES,
	MAX_SUFFIXES,
	MAX_DICE_MODIFIERS,
	ESSENCE_META,
	CRAFTABLE_MECHANICS,
	isCraftableMechanic,
	isEssenceAffixModifier,
	getEssenceFamily,
	getAffixType,
	getModifierDisplayName,
	getModifierSuffix,
	ESSENCE_STATLINE_MULTIPLIER,
	getEffectiveCraftStatline,
	getModifierRollRange,
	rollModifierValue,
	getRarityTier,
	evaluateEssenceCraftAction,
	MAX_FLAT_DAMAGE_PERCENT,
	BASIC_DIE_BASELINE,
	EDGE_FLAT_DAMAGE_RANGES,
	getEdgeFlatDamageRange,
	getCombinedFlatDamagePerRoll,
	formatFlatDamageRange,
	formatEdgeModifierDisplay,
	formatCraftedModifierDisplay,
	buildImplicitModifiers,
	computeEffectiveDiceStats,
	buildEffectiveStatRows,
	computePlayerBonusesFromModifiers,
	buildCraftedDiceName,
	countAffixes,
	formatModifierRow,
	sumModifierValues,
};
