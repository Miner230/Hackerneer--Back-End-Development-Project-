const RARITY_TIER_INDEX = {
	Common: 0,
	Uncommon: 1,
	Rare: 2,
	Epic: 3,
	Legendary: 4,
};

const ESSENCE_STATLINE_MULTIPLIER = 3;

const PREFIX_MECHANICS = new Set([
	'dice_flat_damage_percent',
	'dice_flat_damage_roll',
	'damage_reduction_penetration',
]);

const STAT_LABELS = {
	crit_chance: 'Critical Chance ☣',
	crit_power: 'Critical Power ☠︎',
	duplication_chance: 'Duplication Chance ☆',
	duplication_number: 'Duplication Number ✵',
	dice_flat_damage_percent: 'Increased Flat Damage %',
	dice_flat_damage_roll: 'Flat Damage per Roll',
	player_flat_health: 'Max Health ♥',
	player_max_health_percent: 'Max Health % ♡',
	damage_reduction_penetration: 'DR Penetration ⚔',
	player_life_regen: 'Life Regen / turn ✚',
	player_speed_bonus: 'Combat Speed ⚡',
};

const DICE_DESCRIPTIONS = {
	'Basic Die':
		'Equip for delves - balanced faces - item level on drop - 1-6 sockets',
	'Crimson Die':
		'Equip - high crit implicit - roll-based flat damage per face - 1-6 sockets',
	'Bone Die':
		'Equip - 8 rolls per attack - item level on drop - 1-6 sockets',
	'Copper Die':
		'Equip - duplication focus - item level on drop - 1-6 sockets',
};

const EDGE_FLAT_DAMAGE_RANGES = {
	Common: { min: 1, max: 3 },
	Uncommon: { min: 1, max: 6 },
	Rare: { min: 5, max: 15 },
	Epic: { min: 20, max: 60 },
	Legendary: { min: 130, max: 150 },
};

function normalizeRarityKey(rarity) {
	const key = String(rarity || 'Common');
	if (RARITY_TIER_INDEX[key] !== undefined) return key;
	const normalized = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
	return RARITY_TIER_INDEX[normalized] !== undefined ? normalized : 'Common';
}

function getEdgeFlatDamageRange(rarity) {
	return EDGE_FLAT_DAMAGE_RANGES[normalizeRarityKey(rarity)] || EDGE_FLAT_DAMAGE_RANGES.Common;
}

function getEssenceRollRange(statline, rarity, mechanic) {
	if (mechanic === 'dice_flat_damage_roll') {
		return getEdgeFlatDamageRange(rarity);
	}

	const max = Math.max(1, Math.floor(Number(statline) * ESSENCE_STATLINE_MULTIPLIER));
	const tier = RARITY_TIER_INDEX[normalizeRarityKey(rarity)] ?? 0;
	const min = Math.max(1, Math.floor(max * (0.35 + tier * 0.13)));
	const cappedMax = mechanic === 'dice_flat_damage_percent' ? Math.min(200, max) : max;
	return { min, max: cappedMax };
}

function buildLootStatDescription({ name, mechanic, statline, rarity }) {
	if (mechanic === 'enemy_level') {
		return `Use - next delve enemies are +${statline} levels`;
	}

	if (mechanic === 'equip_dice') {
		return DICE_DESCRIPTIONS[name] || 'Equip for delves - item level on drop - 1-6 sockets';
	}

	if (mechanic?.startsWith('face_')) {
		const face = mechanic.replace('face_', '');
		return `Socket into die slot - +${statline} weight on face ${face} (fixed)`;
	}

	if (STAT_LABELS[mechanic]) {
		const { min, max } = getEssenceRollRange(statline, rarity, mechanic);
		const label = STAT_LABELS[mechanic] || mechanic.replace(/_/g, ' ');
		const rollNote = mechanic === 'dice_flat_damage_roll' ? ` (+${min}-${max} per roll)` : '';
		const affixType = PREFIX_MECHANICS.has(mechanic) ? 'Prefix' : 'Suffix';
		return `Drag onto die - ${affixType} - rolls ${min}-${max} ${label}${rollNote}`;
	}

	return `Use item - ${mechanic?.replace(/_/g, ' ') || 'unknown effect'}`;
}

module.exports = {
	ESSENCE_STATLINE_MULTIPLIER,
	getEssenceRollRange,
	buildLootStatDescription,
	DICE_DESCRIPTIONS,
};
