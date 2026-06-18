// monsterConfig.js
const { diceRoll } = require('./diceCalculator.js');

// Player combat stats scale with user level
function computePlayerCombatStats(user) {
	const level = Math.max(1, Number(user?.level || 1));
	const maxHealth = Math.floor(100 + level * 15);
	const damageReduction = Math.min(35, Math.floor(level / 4));
	const playerSpeed = 1;

	return {
		player_max_health: maxHealth,
		player_health: maxHealth,
		player_damage_reduction: damageReduction,
		player_speed: playerSpeed,
	};
}

function computeModifierBonuses(selectedModifiers = []) {
	const bonuses = {
		speedMultiplier: 1,
		critChanceBonus: 0,
		critPowerBonus: 0,
		duplicationChanceBonus: 0,
		duplicationNumberBonus: 0,
		levelBonus: 0,
	};

	selectedModifiers.forEach((mod) => {
		switch (mod.name) {
			case 'Speedy':
				bonuses.speedMultiplier *= 1.5;
				break;
			case 'Bloodthirsty':
				bonuses.critChanceBonus += 12;
				break;
			case 'Deadly':
				bonuses.critPowerBonus += 35;
				break;
			case 'Echoing':
				bonuses.duplicationChanceBonus += 10;
				break;
			case 'Prolific':
				bonuses.duplicationNumberBonus += 1;
				break;
			case 'Savage':
				bonuses.levelBonus += 3;
				break;
			default:
				break;
		}
	});

	return bonuses;
}

function computeMonsterSpeed(monsterLevel, selectedModifiers = []) {
	let speed = Math.max(1, Math.min(4, 1 + Math.floor(monsterLevel / 100)));
	const { speedMultiplier } = computeModifierBonuses(selectedModifiers);
	speed = Math.ceil(speed * speedMultiplier);
	return Math.min(5, speed);
}

function buildMonsterDiceProfile(monsterLevel, selectedModifiers = []) {
	const bonuses = computeModifierBonuses(selectedModifiers);
	const effectiveLevel = monsterLevel + bonuses.levelBonus;

	return {
		side_1: 10,
		side_2: 10,
		side_3: 10,
		side_4: 10,
		side_5: 10,
		side_6: 10,
		level: effectiveLevel,
		crit_chance: Math.min(50, 8 + Math.floor(monsterLevel / 25) + bonuses.critChanceBonus),
		crit_power: Math.min(400, 175 + bonuses.critPowerBonus),
		duplication_chance: Math.min(60, 8 + Math.floor(monsterLevel / 50) + bonuses.duplicationChanceBonus),
		duplication_number: Math.min(5, 1 + Math.floor(monsterLevel / 200) + bonuses.duplicationNumberBonus),
	};
}

function applyDamageReduction(rawDamage, reductionPercent) {
	if (!reductionPercent) return Math.max(1, rawDamage);
	return Math.max(1, Math.floor((rawDamage * (100 - reductionPercent)) / 100));
}

function applyMonsterDamageFromPlayerRoll(rollResult, monsterDR, lifeRegen) {
	const afterReduction = applyDamageReduction(rollResult, monsterDR);
	return Math.max(0, afterReduction - (lifeRegen || 0));
}

function formatRollDescription(roll, actor = 'You') {
	const { rollResult, rollValue, level_result_Modifier, isCrit, multiplier, duplicationCount, baseRolls } =
		roll;
	let description = '';

	if (level_result_Modifier > 0 && isCrit) {
		description = `Critical Hit! ${actor} rolled: ${rollResult} ((${rollValue} + ${level_result_Modifier}) × ${multiplier})`;
	} else if (isCrit) {
		description = `Critical Hit! ${actor} rolled: ${rollResult} (${rollValue} × ${multiplier})`;
	} else if (level_result_Modifier > 0) {
		description = `${actor} rolled: ${rollResult} (${rollValue} + ${level_result_Modifier} level bonus)`;
	} else {
		description = `${actor} rolled: ${rollResult}`;
	}

	if (duplicationCount > 0) {
		description += ` — Duplicated ${duplicationCount} ${duplicationCount === 1 ? 'time' : 'times'}`;
	}

	if (baseRolls.length > 1) {
		description += ` (Dice rolls: ${baseRolls.join(', ')})`;
	}

	return description;
}

function executeMonsterAttacks(monsterLevel, monsterSpeed, playerDR, selectedModifiers = []) {
	const attacks = [];
	let totalDamage = 0;
	const profile = buildMonsterDiceProfile(monsterLevel, selectedModifiers);

	for (let i = 0; i < monsterSpeed; i++) {
		const rolled = diceRoll(profile);
		if (!rolled) continue;

		const damageDealt = applyDamageReduction(rolled.rollResult, playerDR);
		totalDamage += damageDealt;
		attacks.push({
			...rolled,
			damageDealt,
			description: formatRollDescription(rolled, 'Monster'),
		});
	}

	return { attacks, totalDamage };
}

function resolveCombatAction(instance, playerRoll) {
	if ((instance.active_turn || 'player') !== 'player') {
		throw new Error('It is not your turn to attack');
	}

	if ((instance.attacks_remaining ?? 0) <= 0) {
		throw new Error('No attacks remaining this turn');
	}

	let health = instance.health;
	let playerHealth = instance.player_health ?? instance.player_max_health ?? 100;
	let attacksRemaining = instance.attacks_remaining ?? instance.player_speed ?? 1;
	let activeTurn = 'player';
	let status = 'in progress';
	let monsterTurn = null;

	const rawDamageToMonster = applyMonsterDamageFromPlayerRoll(
		playerRoll.rollResult,
		instance.damage_reduction,
		instance.life_regen
	);
	const playerDamageToMonster = rawDamageToMonster;

	health = health - playerDamageToMonster;
	if (health <= 0) {
		health = 0;
	}
	attacksRemaining = Math.max(0, attacksRemaining - 1);

	if (health <= 0) {
		status = 'completed';
	} else if (attacksRemaining <= 0) {
		monsterTurn = executeMonsterAttacks(
			instance.level,
			instance.monster_speed ?? 2,
			instance.player_damage_reduction ?? 0,
			instance.modifiers || []
		);
		playerHealth = Math.max(0, playerHealth - monsterTurn.totalDamage);
		activeTurn = 'player';
		attacksRemaining = instance.player_speed ?? 1;

		if (playerHealth <= 0) {
			status = 'completed';
		}
	}

	return {
		health,
		playerHealth,
		attacksRemaining,
		activeTurn,
		status,
		playerDamageToMonster,
		monsterTurn,
	};
}

function evaluateDelveResult({
	updated_delve_stats,
	playerRoll,
	monsterTurn = null,
	combatSummary = null,
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
	const rollDescription = formatRollDescription(playerRoll, 'You');

	// outcome messages
	let outcomeMessage = 'Keep going!';
	let rewards = null;
	let monsterAttackMessage = null;

	if (monsterTurn?.totalDamage > 0) {
		const hitCount = monsterTurn.attacks.length;
		monsterAttackMessage = `Monster attacks ${hitCount} ${hitCount === 1 ? 'time' : 'times'} for ${monsterTurn.totalDamage} total damage!`;
	}

	if (current.player_health <= 0) {
		current.player_health = 0;
		outcomeMessage = 'You were slain by the monster!';
		current.status = 'completed';
	} else if (current.health <= 0) {
		current.health = 0;
		outcomeMessage = 'Success! Monster killed!';
		current.status = 'completed';
	} else if (monsterTurn) {
		outcomeMessage = 'Monster turn complete. Your turn!';
	} else if ((current.attacks_remaining ?? 0) > 0) {
		outcomeMessage = `Your turn — ${current.attacks_remaining} attack(s) left.`;
	}

	return {
		success: true,
		rolled: rollDescription,
		message: outcomeMessage,
		monsterAttack: monsterAttackMessage,
		monsterTurn: monsterTurn,
		stats: {
			level: current.level,
			health: current.health,
			roll_attempt: current.roll_attempt,
			monster_id: current.monster_id,
			monster_name: current.monster_name,
			life_regen: current.life_regen,
			damage_reduction: current.damage_reduction,
			player_health: current.player_health,
			player_max_health: current.player_max_health,
			player_damage_reduction: current.player_damage_reduction,
			player_speed: current.player_speed,
			monster_speed: current.monster_speed,
			active_turn: current.active_turn,
			attacks_remaining: current.attacks_remaining,
			modifiers: current.modifiers || [],
			item_quantity: current.item_quantity,
			item_rarity: current.item_rarity,
			status: current.status,
		},
		rewards: rewards,
		raw: {
			rollResult: playerRoll.rollResult,
			rollValue: playerRoll.rollValue,
			level_result_Modifier: playerRoll.level_result_Modifier,
			isCrit: playerRoll.isCrit,
			duplicationCount: playerRoll.duplicationCount,
			baseRolls: playerRoll.baseRolls,
			multiplier: playerRoll.multiplier,
			playerDamageToMonster: combatSummary?.playerDamageToMonster ?? null,
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
	itemQuantity,
	itemRarity
) {
	let lifeRegen = 0;
	let damageReduction = 0;
	const COMBAT_ONLY_MODIFIERS = new Set([
		'Speedy',
		'Bloodthirsty',
		'Deadly',
		'Echoing',
		'Prolific',
		'Savage',
	]);

	// Loop through each selected modifier and apply its effect
	selectedModifiers.forEach((mod) => {
		switch (mod.name) {
			case 'Giant':
				// Doubling monster health based on modifier
				monsterHealth *= 2;
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
				itemQuantity += 1;
				itemRarity += 30;
				monsterName = `${mod.name} ${monsterName}`;
				break;
			default:
				if (COMBAT_ONLY_MODIFIERS.has(mod.name)) {
					monsterName = `${mod.name} ${monsterName}`;
				}
				break;
		}
	});

	// Ensure that lifeRegen and damageReduction are never undefined
	lifeRegen = lifeRegen || 0;
	damageReduction = damageReduction || 0;

	// Return the updated values along with the modified monster name
	return { monsterName, lifeRegen, damageReduction, monsterHealth, rollAttempt, itemQuantity, itemRarity };
}

function computeMonsterLootStats(monsterLevel, selectedModifiers = []) {
	const modifierCount = Array.isArray(selectedModifiers) ? selectedModifiers.length : 0;
	const itemQuantity = 1 + Math.floor(monsterLevel / 12) + modifierCount;
	const itemRarity = 8 + Math.floor(monsterLevel * 0.85) + modifierCount * 20;

	return { itemQuantity, itemRarity };
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
	let { itemQuantity, itemRarity } = computeMonsterLootStats(monsterLevel, selectedModifiers);
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
		itemQuantity,
		itemRarity
	);

	// Get the updated values from applyModifierEffects
	monsterName = effects.monsterName;
	monsterHealth = effects.monsterHealth; 
	rollAttempt = effects.rollAttempt; 
	const lifeRegen = effects.lifeRegen;
	const damageReduction = effects.damageReduction;
	itemQuantity = effects.itemQuantity;
	itemRarity = effects.itemRarity;
	const monsterSpeed = computeMonsterSpeed(monsterLevel, selectedModifiers);

	return {
		level: monsterLevel,
		health: monsterHealth, 
		rollAttempt: rollAttempt, 
		itemQuantity,
		itemRarity,
		moddedMonsterName: monsterName, 
		life_regen: lifeRegen, 
		damage_reduction: damageReduction,
		monster_speed: monsterSpeed,
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
			item_quantity: scaledMonster.itemQuantity,
			item_rarity: scaledMonster.itemRarity,
			modded_monster_name: scaledMonster.moddedMonsterName,
			life_regen: scaledMonster.life_regen,
			damage_reduction: scaledMonster.damage_reduction,
			monster_speed: scaledMonster.monster_speed,
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
		item_quantity: rows[0].item_quantity,
		item_rarity: rows[0].item_rarity,
		player_health: rows[0].player_health ?? rows[0].player_max_health ?? 100,
		player_max_health: rows[0].player_max_health ?? 100,
		player_damage_reduction: rows[0].player_damage_reduction ?? 0,
		player_speed: rows[0].player_speed ?? 1,
		monster_speed: rows[0].monster_speed ?? 2,
		active_turn: rows[0].active_turn ?? 'player',
		attacks_remaining: rows[0].attacks_remaining ?? rows[0].player_speed ?? 1,
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
	computeMonsterLootStats,
	processMonsterData,
	formatDelveResults,
	computePlayerCombatStats,
	computeMonsterSpeed,
	resolveCombatAction,
	executeMonsterAttacks,
	formatRollDescription,
};
