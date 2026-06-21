// monsterConfig.js
const { diceRoll } = require('./diceCalculator.js');
const { buildModdedMonsterName } = require('../utils/modifierTierNames.js');

// Player combat stats scale with user level and dice-crafted essence bonuses
function computePlayerCombatStats(user, playerBonuses = {}) {
	const level = Math.max(1, Number(user?.level || 1));
	const baseMaxHealth = Math.floor(100 + level * 15);
	const flatHealth = Number(playerBonuses.player_flat_health || 0);
	const maxHealthPercent = Number(playerBonuses.player_max_health_percent || 0);
	const maxHealth = Math.floor((baseMaxHealth + flatHealth) * (1 + maxHealthPercent / 100));
	const damageReduction = Math.min(35, Math.floor(level / 4));
	const playerSpeedBonus = Number(playerBonuses.player_speed_bonus || 0);
	const playerSpeed = Math.max(1, 1 + playerSpeedBonus);
	const playerLifeRegen = Number(playerBonuses.player_life_regen || 0);
	const damageReductionPenetration = Number(playerBonuses.damage_reduction_penetration || 0);

	return {
		player_max_health: maxHealth,
		player_health: maxHealth,
		player_damage_reduction: damageReduction,
		player_speed: playerSpeed,
		player_life_regen: playerLifeRegen,
		damage_reduction_penetration: damageReductionPenetration,
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

function applyMonsterDamageFromPlayerRoll(rollResult, monsterDR, lifeRegen, drPenetration = 0) {
	const effectiveDR = Math.max(0, Number(monsterDR || 0) - Number(drPenetration || 0));
	const afterReduction = applyDamageReduction(rollResult, effectiveDR);
	return Math.max(0, afterReduction - (lifeRegen || 0));
}

function formatRollDescription(roll, actor = 'You') {
	const {
		rollResult,
		rollValue,
		level_result_Modifier,
		isCrit,
		critPerRoll,
		duplicationCount,
		baseRolls,
	} = roll;
	const critCount = Array.isArray(critPerRoll) ? critPerRoll.filter(Boolean).length : isCrit ? 1 : 0;
	let description = '';

	if (critCount > 0) {
		const critLabel = critCount === 1 ? 'Critical Hit!' : `Critical Hit! (${critCount} rolls)`;
		if (level_result_Modifier > 0) {
			description = `${critLabel} ${actor} rolled: ${rollResult} (${rollValue} + ${level_result_Modifier} level bonus)`;
		} else {
			description = `${critLabel} ${actor} rolled: ${rollResult}`;
		}
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
		throw new Error('It is not your turn');
	}

	if ((instance.attacks_remaining ?? 0) <= 0) {
		throw new Error('No rolls remaining this round');
	}

	let health = instance.health;
	let playerHealth = instance.player_health ?? instance.player_max_health ?? 100;
	let attacksRemaining = instance.attacks_remaining ?? instance.player_speed ?? 1;
	let activeTurn = 'player';
	let status = 'in progress';
	let monsterTurn = null;
	let playerRegenApplied = 0;

	const rawDamageToMonster = applyMonsterDamageFromPlayerRoll(
		playerRoll.rollResult,
		instance.damage_reduction,
		instance.life_regen,
		instance.damage_reduction_penetration ?? 0
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

		let playerRegen = Number(instance.player_life_regen || 0);
		if (playerRegen > 0 && playerHealth > 0) {
			const beforeRegen = playerHealth;
			playerHealth = Math.min(
				instance.player_max_health ?? playerHealth,
				playerHealth + playerRegen
			);
			playerRegenApplied = playerHealth - beforeRegen;
		}

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
		playerRegenApplied,
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
	let playerRegenMessage = null;

	if (monsterTurn?.totalDamage > 0) {
		const hitCount = monsterTurn.attacks.length;
		monsterAttackMessage = `Monster rolled ${hitCount} ${hitCount === 1 ? 'time' : 'times'} for ${monsterTurn.totalDamage} total damage!`;
	}

	if ((combatSummary?.playerRegenApplied ?? 0) > 0) {
		playerRegenMessage = `You regenerated ${combatSummary.playerRegenApplied} HP.`;
	}

	if (current.player_health <= 0) {
		current.player_health = 0;
		outcomeMessage = 'You were slain by the monsters!';
		current.status = 'completed';
	} else if (current.all_enemies_dead || current.health <= 0) {
		current.health = 0;
		const enemyCount = current.enemies?.length || 1;
		outcomeMessage =
			enemyCount > 1 ? 'Success! All enemies defeated!' : 'Success! Monster killed!';
		current.status = 'completed';
	} else if (monsterTurn) {
		outcomeMessage = 'Monster turn complete. Your turn!';
	} else if ((current.attacks_remaining ?? 0) > 0) {
		outcomeMessage = `Your turn — ${current.attacks_remaining} roll(s) left.`;
	}

	return {
		success: true,
		rolled: rollDescription,
		message: outcomeMessage,
		monsterAttack: monsterAttackMessage,
		playerRegen: playerRegenMessage,
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
			player_life_regen: current.player_life_regen ?? 0,
			damage_reduction_penetration: current.damage_reduction_penetration ?? 0,
			player_speed: current.player_speed,
			monster_speed: current.monster_speed,
			active_turn: current.active_turn,
			attacks_remaining: current.attacks_remaining,
			modifiers: current.modifiers || [],
			enemies: current.enemies || [],
			target_enemy_id: combatSummary?.targetEnemyId ?? null,
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
			critPerRoll: playerRoll.critPerRoll,
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

function computeMonsterLevel(user_data) {
	const baseLevel = Math.max(1, Number(user_data?.level || 1));
	const voidstones = Number(user_data?.voidstone_count || 0);
	const randomFactor = Math.floor(Math.random() * 5);
	return baseLevel + voidstones + randomFactor;
}

function pickWeightedModifier(modifiers) {
	const pool = modifiers.filter((mod) => (mod.weight || 0) > 0);
	if (!pool.length) return null;

	const totalWeight = pool.reduce((sum, mod) => sum + mod.weight, 0);
	let roll = Math.floor(Math.random() * totalWeight);

	for (const mod of pool) {
		roll -= mod.weight;
		if (roll < 0) {
			return {
				id: mod.id,
				name: mod.name,
				description: mod.description,
				weight: mod.weight,
			};
		}
	}

	const fallback = pool[pool.length - 1];
	return {
		id: fallback.id,
		name: fallback.name,
		description: fallback.description,
		weight: fallback.weight,
	};
}

// Roll monster modifiers using monster level. Supports duplicate stacks of the same modifier.
function selectMonsterModifiersRandomly(modifiers, monsterLevel) {
	if (!modifiers || modifiers.length === 0) {
		throw new Error('No monster modifiers found in database');
	}

	const level = Math.max(1, Number(monsterLevel) || 1);
	const guaranteedCount = Math.floor(level / 30);
	const bonusRollSlots = Math.max(1, Math.floor(level / 15));
	const rollSlots = guaranteedCount + bonusRollSlots;
	const scaledChance = Math.min(0.95, 0.1 + level * 0.007);

	const selectedModifiers = [];

	for (let slot = 0; slot < rollSlots; slot++) {
		const isGuaranteed = slot < guaranteedCount;
		if (!isGuaranteed && Math.random() >= scaledChance) {
			continue;
		}

		const pick = pickWeightedModifier(modifiers);
		if (pick) selectedModifiers.push(pick);
	}

	return selectedModifiers;
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

	// Loop through each selected modifier and apply its effect
	selectedModifiers.forEach((mod) => {
		switch (mod.name) {
			case 'Giant':
				monsterHealth *= 2;
				break;

			case 'Regenerative':
				lifeRegen += Math.floor(monsterLevel / 2);
				break;

			case 'Fortified': {
				const baseReduction = 0.3;
				const scalingPerLevel = 0.005;
				const maxReduction = 0.8;

				let totalReduction = baseReduction + user_data.level * scalingPerLevel;
				totalReduction = Math.min(totalReduction, maxReduction);

				damageReduction = Math.max(damageReduction, totalReduction * 100);
				break;
			}
			case 'Shiny':
				itemQuantity += 1;
				itemRarity += 30;
				break;
			default:
				break;
		}
	});

	monsterName = buildModdedMonsterName(monsterName, selectedModifiers);

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
function scaleMonster(monster, user_data, selectedModifiers, monsterLevel) {
	const level = monsterLevel ?? computeMonsterLevel(user_data);
	let monsterHealth = Math.floor(5 * Math.pow(level + 1, 1.1));
	let rollAttempt = Math.floor(4 + Math.log2(level + 1));
	let { itemQuantity, itemRarity } = computeMonsterLootStats(level, selectedModifiers);
	monsterHealth = Math.min(monsterHealth, 999999999);
	let monsterName = monster.name;

	const effects = applyModifierEffects(
		selectedModifiers,
		user_data,
		monsterName,
		level,
		monsterHealth,
		rollAttempt,
		itemQuantity,
		itemRarity
	);

	monsterName = effects.monsterName;
	monsterHealth = effects.monsterHealth;
	rollAttempt = effects.rollAttempt;
	const lifeRegen = effects.lifeRegen;
	const damageReduction = effects.damageReduction;
	itemQuantity = effects.itemQuantity;
	itemRarity = effects.itemRarity;
	const monsterSpeed = computeMonsterSpeed(level, selectedModifiers);

	return {
		level,
		health: monsterHealth,
		rollAttempt,
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

		// 2. Roll monster level once, then pick modifiers from that level
		const monsterLevel = computeMonsterLevel(user_data[0]);
		let selectedModifiers = selectMonsterModifiersRandomly(modifier_data, monsterLevel);

		// Ensure selectedModifiers is always an array
		if (!Array.isArray(selectedModifiers)) {
			selectedModifiers = [];
		}

		const selectedModifierIds = selectedModifiers.map((mod) => mod.id);

		// 3. Apply Scaling Based on Player Level, Modifiers, and Items
		const scaledMonster = scaleMonster(selectedMonster, user_data[0], selectedModifiers, monsterLevel);

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
		player_life_regen: rows[0].player_life_regen ?? 0,
		damage_reduction_penetration: rows[0].damage_reduction_penetration ?? 0,
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
	computeMonsterLevel,
	selectMonsterModifiersRandomly,
	scaleMonster,
	computeMonsterLootStats,
	processMonsterData,
	formatDelveResults,
	computePlayerCombatStats,
	computeMonsterSpeed,
	resolveCombatAction,
	executeMonsterAttacks,
	applyMonsterDamageFromPlayerRoll,
	formatRollDescription,
};
