const RARITY_TIERS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

const BASIC_DIE_BASELINE = {
	no_of_rolls: 5,
	duplication_chance: 5,
	duplication_number: 1,
	crit_chance: 10,
	crit_power: 200,
	flat_damage: 0,
};

const DICE_FACE_STATS = {
	side_1: 10,
	side_2: 10,
	side_3: 10,
	side_4: 10,
	side_5: 10,
	side_6: 10,
	image_key: 'dice1',
};

/** Legendary targets per die family — implicits scale down at lower tiers. */
const DICE_FAMILY_TARGETS = {
	'Basic Die': { ...BASIC_DIE_BASELINE },
	'Crimson Die': {
		...BASIC_DIE_BASELINE,
		crit_chance: 18,
		crit_power: 240,
		flat_damage: 5,
	},
	'Bone Die': {
		...BASIC_DIE_BASELINE,
		no_of_rolls: 8,
		flat_damage: 2,
	},
	'Copper Die': {
		...BASIC_DIE_BASELINE,
		duplication_chance: 12,
		duplication_number: 2,
		flat_damage: 3,
	},
};

const DICE_FAMILY_LORE = {
	'Basic Die': 'Every delver begins with a humble cube.',
	'Crimson Die': 'A blood-stained cube that hungers for critical strikes.',
	'Bone Die': "Carved from a fallen delver's remains.",
	'Copper Die': 'Warm metal that echoes every lucky roll.',
};

function getTierStrength(tierIndex) {
	const minStrength = 0.4;
	if (tierIndex <= 0) return minStrength;
	const normalized = tierIndex / (RARITY_TIERS.length - 1);
	return minStrength + normalized * (1 - minStrength);
}

function scaleImplicitValue(baseline, fullValue, strength) {
	const base = Number(baseline);
	const full = Number(fullValue);
	if (full === base) return base;
	return Math.round(base + (full - base) * strength);
}

function getDieFamilyGearForTier(familyName, rarity) {
	const targets = DICE_FAMILY_TARGETS[familyName] || BASIC_DIE_BASELINE;
	const tierIndex = Math.max(0, RARITY_TIERS.indexOf(rarity));
	const strength = getTierStrength(tierIndex);

	return {
		...DICE_FACE_STATS,
		no_of_rolls: scaleImplicitValue(
			BASIC_DIE_BASELINE.no_of_rolls,
			targets.no_of_rolls,
			strength
		),
		duplication_chance: scaleImplicitValue(
			BASIC_DIE_BASELINE.duplication_chance,
			targets.duplication_chance,
			strength
		),
		duplication_number: scaleImplicitValue(
			BASIC_DIE_BASELINE.duplication_number,
			targets.duplication_number,
			strength
		),
		crit_chance: scaleImplicitValue(
			BASIC_DIE_BASELINE.crit_chance,
			targets.crit_chance,
			strength
		),
		crit_power: scaleImplicitValue(
			BASIC_DIE_BASELINE.crit_power,
			targets.crit_power,
			strength
		),
		flat_damage:
			targets.flat_damage > 0
				? Math.max(1, Math.round(targets.flat_damage * strength))
				: 0,
	};
}

function buildDiceGearStatDescription(familyName, gear) {
	const parts = [];

	if (Number(gear.no_of_rolls) > BASIC_DIE_BASELINE.no_of_rolls) {
		parts.push(`${gear.no_of_rolls} rolls`);
	}
	if (Number(gear.crit_chance) > BASIC_DIE_BASELINE.crit_chance) {
		parts.push(`Crit ${gear.crit_chance}%`);
	}
	if (Number(gear.crit_power) > BASIC_DIE_BASELINE.crit_power) {
		parts.push(`Crit power ${gear.crit_power}%`);
	}
	if (Number(gear.duplication_chance) > BASIC_DIE_BASELINE.duplication_chance) {
		parts.push(`Duplication ${gear.duplication_chance}%`);
	}
	if (Number(gear.duplication_number) > BASIC_DIE_BASELINE.duplication_number) {
		parts.push(`Dup count ${gear.duplication_number}`);
	}
	if (Number(gear.flat_damage) > 0) {
		parts.push(`+${gear.flat_damage} flat damage base`);
	}

	if (familyName === 'Basic Die' || parts.length === 0) {
		return 'Equip for delves - balanced faces - item level on drop - 0-6 sockets';
	}

	return `Equip - ${parts.join(' · ')} - item level on drop - 0-6 sockets`;
}

function getDiceFamiliesForDrops() {
	return ['Crimson Die', 'Bone Die', 'Copper Die'];
}

function getDiceTiersForFamily(familyName) {
	if (familyName === 'Basic Die') return ['Common'];
	return RARITY_TIERS;
}

function getDiceDropWeight(familyName) {
	return familyName === 'Basic Die' ? 0 : 12;
}

module.exports = {
	RARITY_TIERS,
	BASIC_DIE_BASELINE,
	DICE_FAMILY_TARGETS,
	DICE_FAMILY_LORE,
	getTierStrength,
	getDieFamilyGearForTier,
	buildDiceGearStatDescription,
	getDiceFamiliesForDrops,
	getDiceTiersForFamily,
	getDiceDropWeight,
};
