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

		return {
			face,
			isCrit,
			multiplier,
			scoredValue: Math.floor(face * multiplier),
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

	// Calculate the raw sum of all rolled face values
	const rawRollValue = baseRolls.reduce((a, b) => a + b, 0);

	// Apply level modifier (level starts at 1, so subtract 1)
	const levelModifier = row.level - 1;

	const scoredRollValue = rollOutcomes.reduce((sum, outcome) => sum + outcome.scoredValue, 0);
	const finalRoll = scoredRollValue + levelModifier;

	const isCrit = critPerRoll.some(Boolean);
	const multiplier = isCrit ? row.crit_power / 100 : 1;

	// Return detailed roll breakdown
	return {
		rolls: baseRolls,
		baseRolls,
		critPerRoll,
		duplicationCount: baseRolls.length - 1,
		rollValue: rawRollValue,
		rollResult: finalRoll,
		isCrit,
		multiplier,
		level_result_Modifier: levelModifier,
	};
}

module.exports = { diceRoll };
