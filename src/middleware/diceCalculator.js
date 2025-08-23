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

	// Store results of all rolls
	const detailedRolls = [];

	// Roll the first base value
	const baseRoll = rollOnce();
	if (baseRoll === null) return null;
	detailedRolls.push(baseRoll);

	// Setup duplication parameters
	const duplicationChance = Math.min(row.duplication_chance, 100);
	const duplicationNumber = row.duplication_number;

	// Attempt duplication rolls based on chance and number allowed
	for (let i = 0; i < duplicationNumber; i++) {
		const roll = Math.floor(Math.random() * 100);
		if (roll < duplicationChance) {
			const extraRoll = rollOnce();
			if (extraRoll !== null) detailedRolls.push(extraRoll);
		}
	}

	// Calculate the raw sum of all rolled values
	const rawRollValue = detailedRolls.reduce((a, b) => a + b, 0);

	// Apply level modifier (level starts at 1, so subtract 1)
	const levelModifier = row.level - 1;

	// Check for critical hit and apply multiplier
	const critRoll = Math.floor(Math.random() * 100);
	const isCrit = critRoll < row.crit_chance;
	const multiplier = isCrit ? row.crit_power / 100 : 1;


	// Final calculated roll value after modifiers
	const finalRoll = Math.floor((rawRollValue + levelModifier) * multiplier);

	// Return detailed roll breakdown
	return {
		rolls: detailedRolls, // All rolls as individual numbers
		baseRolls: detailedRolls, // Same as rolls here
		duplicationCount: detailedRolls.length - 1,
		rollValue: rawRollValue,
		rollResult: finalRoll,
		isCrit: isCrit,
		multiplier: multiplier,
		level_result_Modifier: levelModifier,
	};
}

module.exports = { diceRoll };
