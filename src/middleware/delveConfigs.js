// monsterConfig.js
// handler for displaying delve results in a readable format
// checks if a crit was rolled, if a duplication occurred, and displays it along with the updated monster stats
function evaluateDelveResult({
	updated_delve_stats,
	rollResult,
	rollValue,
	level_result_Modifier,
	isCrit,
	duplicationCount,
	baseRolls,
	multiplier,
}) {
	// Basic validation
	if (!updated_delve_stats || updated_delve_stats.length === 0) {
		return {
			success: false,
			message: 'Error: Delve stats are missing or invalid',
			stats: null,
		};
	}

	const current = updated_delve_stats[0]; // Use first row of stats

	if (!current) {
		return {
			success: false,
			message: 'Error: Delve stat is missing',
			stats: null,
		};
	}

	// Construct roll result string
	let rollDescription = '';

	if (level_result_Modifier > 0 && isCrit) {
		rollDescription = `Critical Hit! You rolled: ${rollResult} ((${rollValue} + ${level_result_Modifier}) × ${multiplier})`;
	} else if (isCrit) {
		rollDescription = `Critical Hit! You rolled: ${rollResult} (${rollValue} × ${multiplier})`;
	} else if (level_result_Modifier > 0) {
		rollDescription = `You rolled: ${rollResult} (${rollValue} + ${level_result_Modifier} level bonus)`;
	} else {
		rollDescription = `You rolled: ${rollResult}`;
	}

	if (duplicationCount > 0) {
		rollDescription += ` — Duplicated ${duplicationCount} ${duplicationCount === 1 ? 'time' : 'times'}`;
	}

	if (baseRolls.length > 1) {
		rollDescription += ` (Dice rolls: ${baseRolls.join(', ')})`;
	}

	// outcome messages
	let outcomeMessage = 'Keep going!';
	let rewards = null;
	
	if (current.health > 0 && current.roll_attempt <= 0) {
		outcomeMessage = 'Boooo you suck';
		current.status = 'completed';
	} else if (current.health <= 0) {
		current.health = 0;
		outcomeMessage = 'Success! Monster killed!';
		rewards = { type: 'loot_shard', amount: 1 };
		current.status = 'completed';
	}

	return { //formats the output into a frontend readable format
		success: true,
		rolled: rollDescription,
		message: outcomeMessage,
		stats: {
			level: current.level,
			health: current.health,
			roll_attempt: current.roll_attempt,
			monster_id: current.monster_id,
			monster_name: current.monster_name,
			life_regen: current.life_regen,
			damage_reduction: current.damage_reduction,
			modifiers: current.modifiers || [],
			loot_shard_count: current.loot_shard_count,
			status: current.status,
		},
		rewards: rewards,
		raw: {
			rollResult,
			rollValue,
			level_result_Modifier,
			isCrit,
			duplicationCount,
			baseRolls,
			multiplier,
		},
	};
}

// Function to randomly select a monster based on a weighted system
function selectMonsterRandomly(monsters, user_data) {
	if (!monsters || monsters.length === 0) {
		throw new Error('No monsters found in database'); 
	}

	const weightedMonsters = monsters.map((monster) => ({
		id: monster.id, 
		name: monster.name, 
		description: monster.description, 
		weight: monster.weight || 0, // Default to 0 weight if not defined
	}));

	const totalWeight = weightedMonsters.reduce((sum, s) => sum + s.weight, 0); // Calculate total weight of all monsters
	const roll = Math.floor(Math.random() * totalWeight); // Generate a random number based on total weight

	let accumulator = 0;
	let selectedMonster = null;

	// Loop through weighted monsters and select one based on the roll
	for (let i = 0; i < weightedMonsters.length; i++) {
		accumulator += weightedMonsters[i].weight; // Accumulate weight
		if (roll < accumulator) {
			selectedMonster = weightedMonsters[i]; 
			break;
		}
	}

	if (!selectedMonster) {
		throw new Error('Error selecting monster'); // If no monster was selected, throw an error
	}

	return selectedMonster; // Return the selected monster
}

// Function to randomly select monster modifiers
function selectMonsterModifiersRandomly(modifiers, user_data) {
	if (!modifiers || modifiers.length === 0) {
		throw new Error('No monster modifiers found in database'); // Ensure modifiers data exists
	}

	const selectedModifiers = [];

	// Ensure that modifiers are selected based on user data
	modifiers.forEach((mod) => {
		const totalWeight = 1000 - (user_data.level + user_data.voidstone_count); // Calculate total weight based on user stats
		const weight = mod.weight || 0;
		const roll = Math.floor(Math.random() * totalWeight); // Generate a random number based on total weight

		if (roll < weight) {
			selectedModifiers.push({
				id: mod.id, 
				name: mod.name, 
				description: mod.description, 
				weight: mod.weight, 
			});
		}
	});

	// Ensure selectedModifiers is an array and return
	return Array.isArray(selectedModifiers) ? selectedModifiers : [];
}

// Apply modifier effects to monster stats
function applyModifierEffects(
	selectedModifiers,
	user_data,
	monsterName,
	monsterLevel,
	monsterHealth,
	rollAttempt,
	lootShardCount
) {
	let lifeRegen = 0;
	let damageReduction = 0;
	// Loop through each selected modifier and apply its effect
	selectedModifiers.forEach((mod) => {
		switch (mod.name) {
			case 'Giant':
				// Doubling monster health based on modifier
				monsterHealth *= 2; 
				monsterName = `${mod.name} ${monsterName}`; 
				break;

			case 'Subtracting':
				// Reducing roll attempts but not below 1
				rollAttempt = Math.max(1, rollAttempt - 1); 
				monsterName = `${mod.name} ${monsterName}`; 
				break;

			case 'Regenerative':
				// Setting life regeneration based on monster level
				lifeRegen = Math.floor(monsterLevel / 2); 
				monsterName = `${mod.name} ${monsterName}`; 
				break;

			case 'Fortified':
				// Calculating damage reduction based on user level
				const baseReduction = 0.3; // 30% base damage reduction
				const scalingPerLevel = 0.005; // 0.5% per level
				const maxReduction = 0.8; // 80% max cap

				let totalReduction = baseReduction + user_data.level * scalingPerLevel;
				totalReduction = Math.min(totalReduction, maxReduction); // Cap the reduction at 80%

				damageReduction = totalReduction * 100; // Apply damage reduction in percentage
				monsterName = `${mod.name} ${monsterName}`; // Modify name
				break;
			case 'Shiny':
				lootShardCount *= 2; // Apply reward modifier
				monsterName = `${mod.name} ${monsterName}`; // Modify name
				break;
			default:
				break;
		}
	});

	// Ensure that lifeRegen and damageReduction are never undefined
	lifeRegen = lifeRegen || 0;
	damageReduction = damageReduction || 0;

	// Return the updated values along with the modified monster name
	return { monsterName, lifeRegen, damageReduction, monsterHealth, rollAttempt, lootShardCount };
}

// Scale the monster's stats based on user data and modifiers
function scaleMonster(monster, user_data, selectedModifiers) {
	const baseLevel = Math.max(1, Number(user_data?.level || 1)); // never below 1
	const voidstones = Number(user_data?.voidstone_count || 0);
	const randomFactor = Math.floor(Math.random() * 5); // 0 to 4

	const monsterLevel = baseLevel + voidstones + randomFactor;
	//random level in range of +3 -3 of user level
	let monsterHealth = Math.floor(5 * Math.pow(monsterLevel + 1, 1.1)); // Initial health calculation
	let rollAttempt = Math.floor(4 + Math.log2(monsterLevel + 1)); // Initial roll attempts calculation falls off harder at higher levels
	let lootShardCount = 1 + Math.floor(monsterLevel / 10) + selectedModifiers.length; // Loot shard count based on monster level and modifiers
	//cap monster health to prevent out of range errors
	monsterHealth = Math.min(monsterHealth, 999999999);
	// Base monster name
	let monsterName = monster.name;

	// Call applyModifierEffects to get updated values
	const effects = applyModifierEffects(
		selectedModifiers,
		user_data,
		monsterName,
		monsterLevel,
		monsterHealth,
		rollAttempt,
		lootShardCount
	);

	// Get the updated values from applyModifierEffects
	monsterName = effects.monsterName;
	monsterHealth = effects.monsterHealth; 
	rollAttempt = effects.rollAttempt; 
	const lifeRegen = effects.lifeRegen;
	const damageReduction = effects.damageReduction;
	lootShardCount = effects.lootShardCount;
	return {
		level: monsterLevel,
		health: monsterHealth, 
		rollAttempt: rollAttempt, 
		lootShardCount: lootShardCount, 
		moddedMonsterName: monsterName, 
		life_regen: lifeRegen, 
		damage_reduction: damageReduction, 
	};
}

// Process monster data based on user data, monster data, and modifiers
function processMonsterData(monster_data, modifier_data, user_data) {
	try {
		// Ensure valid data is passed
		if (!monster_data || !monster_data.length) {
			throw new Error('No monster data provided');
		}
		if (!modifier_data || !modifier_data.length) {
			throw new Error('No modifier data provided');
		}
		if (!user_data || !user_data.length) {
			throw new Error('No user data provided');
		}

		// 1. Randomly Select Monster
		const selectedMonster = selectMonsterRandomly(monster_data, user_data[0]);

		// 2. Randomly Select Monster Modifiers
		let selectedModifiers = selectMonsterModifiersRandomly(modifier_data, user_data[0]);

		// Ensure selectedModifiers is always an array
		if (!Array.isArray(selectedModifiers)) {
			selectedModifiers = [];
		}

		const selectedModifierIds = selectedModifiers.map((mod) => mod.id);

		// 3. Apply Scaling Based on Player Level, Modifiers, and Items
		const scaledMonster = scaleMonster(selectedMonster, user_data[0], selectedModifiers);

		// Return the final result with updated stats
		const result = {
			selectedMonsters: selectedMonster,
			selectedModifiers: selectedModifiers,
			selectedModifierIds: selectedModifierIds,
			monsters_level: scaledMonster.level,
			monsters_health: scaledMonster.health,
			roll_attempt: scaledMonster.rollAttempt,
			loot_shard_count: scaledMonster.lootShardCount,
			modded_monster_name: scaledMonster.moddedMonsterName,
			life_regen: scaledMonster.life_regen,
			damage_reduction: scaledMonster.damage_reduction,
		};

		return result;
	} catch (error) {
		console.error('Error processing monster data:', error);
		throw new Error('Error processing monster data: ' + error.message); // Handle errors that occur during monster data processing
	}
}

function formatDelveResults(rows) {
	const base = {
		delve_id: rows[0].delve_id,
		user_id: rows[0].user_id,
		monster_id: rows[0].monster_id,
		monster_name: rows[0].monster_name,
		monster_description: rows[0].monster_description,
		modifiers: [],
		level: rows[0].level,
		health: rows[0].health,
		life_regen: rows[0].life_regen,
		damage_reduction: rows[0].damage_reduction,
		roll_attempt: rows[0].roll_attempt,
		loot_shard_count: rows[0].loot_shard_count,
		status: rows[0].status,
	};

	rows.forEach((row) => {
		if (row.modifier_id && row.modifier_name) {
			base.modifiers.push({
				id: row.modifier_id,
				name: row.modifier_name,
				description: row.modifier_description,
			});
		}
	});

	return base; // always return modifiers as an array
}

module.exports = {
	evaluateDelveResult,
	selectMonsterRandomly,
	selectMonsterModifiersRandomly,
	scaleMonster,
	processMonsterData,
	formatDelveResults,
};
