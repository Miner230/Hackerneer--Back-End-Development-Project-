const MAX_FLAT_DAMAGE_PERCENT = 200;

function randomInt(min, max) {
	const low = Math.min(min, max);
	const high = Math.max(min, max);
	return Math.floor(Math.random() * (high - low + 1)) + low;
}

function rollPerRollFlatBonus(row) {
	const gearMin = Number(row.flat_damage_min || 0);
	const gearMax = Number(row.flat_damage_max || 0);
	const edgeMin = Number(row.flat_damage_roll_min || 0);
	const edgeMax = Number(row.flat_damage_roll_max || 0);
	const percent = Math.min(MAX_FLAT_DAMAGE_PERCENT, Number(row.flat_damage_percent || 0));

	let bonus = 0;

	if (gearMax > 0) {
		bonus += randomInt(gearMin || 1, gearMax);
	} else {
		const legacyGearFlat = Number(row.flat_damage || 0);
		if (legacyGearFlat > 0) {
			bonus += randomInt(1, Math.min(5, legacyGearFlat));
		}
	}

	if (edgeMax > 0) {
		bonus += randomInt(edgeMin || 1, edgeMax);
	}

	if (bonus > 0 && percent > 0) {
		bonus = Math.floor(bonus * (1 + percent / 100));
	}

	return bonus;
}

// Function to simulate a weighted dice roll
function diceRoll(row) {
	// Map each dice side to its assigned weight from the row data
	const weights = [
		{ side: 1, weight: row.side_1 },
		{ side: 2, weight: row.side_2 },
		{ side: 3, weight: row.side_3 },
		{ side: 4, weight: row.side_4 },
		{ side: 5, weight: row.side_5 },
		{ side: 6, weight: row.side_6 },
	];

	// Sum total weight for probability calculation
	const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

	// Perform one weighted roll and return the resulting side
	function rollOnce() {
		const roll = Math.floor(Math.random() * totalWeight);
		let accumulator = 0;
		for (let i = 0; i < weights.length; i++) {
			accumulator += weights[i].weight;
			if (roll < accumulator) return weights[i].side;
		}
		return null; // Fallback (should not occur with valid weights)
	}

	function rollDieWithCrit() {
		const face = rollOnce();
		if (face === null) return null;

		const critRoll = Math.floor(Math.random() * 100);
		const isCrit = critRoll < row.crit_chance;
		const multiplier = isCrit ? row.crit_power / 100 : 1;
		const flatBonus = rollPerRollFlatBonus(row);

		return {
			face,
			isCrit,
			multiplier,
			flatBonus,
			scoredValue: Math.floor(face * multiplier) + flatBonus,
		};
	}

	const rollOutcomes = [];

	// Roll the first base value (with its own crit check)
	const baseOutcome = rollDieWithCrit();
	if (baseOutcome === null) return null;
	rollOutcomes.push(baseOutcome);

	// Setup duplication parameters
	const duplicationChance = Math.min(row.duplication_chance, 100);
	const duplicationNumber = row.duplication_number;

	// Each duplicate roll also rolls for crit independently
	for (let i = 0; i < duplicationNumber; i++) {
		const roll = Math.floor(Math.random() * 100);
		if (roll < duplicationChance) {
			const extraOutcome = rollDieWithCrit();
			if (extraOutcome !== null) rollOutcomes.push(extraOutcome);
		}
	}

	const baseRolls = rollOutcomes.map((outcome) => outcome.face);
	const critPerRoll = rollOutcomes.map((outcome) => outcome.isCrit);
	const flatPerRoll = rollOutcomes.map((outcome) => outcome.flatBonus || 0);

	// Calculate the raw sum of all rolled face values
	const rawRollValue = baseRolls.reduce((a, b) => a + b, 0);

	// Apply level modifier (level starts at 1, so subtract 1)
	const levelModifier = row.level - 1;

	const scoredRollValue = rollOutcomes.reduce((sum, outcome) => sum + outcome.scoredValue, 0);
	const totalFlatBonus = flatPerRoll.reduce((sum, value) => sum + value, 0);
	const finalRoll = scoredRollValue + levelModifier;

	const isCrit = critPerRoll.some(Boolean);
	const multiplier = isCrit ? row.crit_power / 100 : 1;

	// Return detailed roll breakdown
	return {
		rolls: baseRolls,
		baseRolls,
		critPerRoll,
		flatPerRoll,
		duplicationCount: baseRolls.length - 1,
		rollValue: rawRollValue,
		rollResult: finalRoll,
		isCrit,
		multiplier,
		level_result_Modifier: levelModifier,
		flat_damage: totalFlatBonus,
	};
}

module.exports = { diceRoll };
