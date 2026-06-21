(function () {
	const MIN_ENCOUNTER_SIZE = 1;
	const MAX_ENCOUNTER_SIZE = 5;

	function buildEncounterWeights(depth = 0, roomType = null) {
		const d = Math.max(0, Math.floor(Number(depth) || 0));
		const weights = [48, 26, 14, 8, 4];

		const transfer = Math.min(d * 2.5, 32);
		weights[0] -= transfer;
		weights[1] += transfer * 0.35;
		weights[2] += transfer * 0.28;
		weights[3] += transfer * 0.22;
		weights[4] += transfer * 0.15;

		const roomBoost =
			roomType === 'vault' ? 1.2 : roomType === 'chamber' ? 0.6 : roomType === 'hall' ? 0 : 0;
		if (roomBoost > 0) {
			weights[0] = Math.max(10, weights[0] - roomBoost * 6);
			weights[2] += roomBoost * 2;
			weights[3] += roomBoost * 2.5;
			weights[4] += roomBoost * 3;
		}

		const maxOther = Math.max(weights[1], weights[2], weights[3], weights[4]);
		if (weights[0] <= maxOther) {
			weights[0] = maxOther + 2;
		}

		return weights;
	}

	function pickEncounterCountFromWeights(weights, randomFn) {
		const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
		let roll = randomFn() * total;
		for (let i = 0; i < weights.length; i += 1) {
			roll -= Math.max(0, weights[i]);
			if (roll <= 0) return i + 1;
		}
		return 1;
	}

	function rollEncounterCountFromRng(depth = 0, roomType = null, rng) {
		const randomFn = typeof rng === 'function' ? rng : () => Math.random();
		return pickEncounterCountFromWeights(buildEncounterWeights(depth, roomType), randomFn);
	}

	window.DungeonEncounter = {
		MIN_ENCOUNTER_SIZE,
		MAX_ENCOUNTER_SIZE,
		rollEncounterCountFromRng,
	};
})();
