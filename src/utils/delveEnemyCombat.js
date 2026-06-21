const {
	allEnemiesDead,
	getLivingEnemies,
	resolveTargetEnemy,
} = require('./delveEncounter.js');
const {
	applyMonsterDamageFromPlayerRoll,
	executeMonsterAttacks,
} = require('../middleware/delveConfigs.js');

function executeAllMonsterAttacks(livingEnemies, playerDR) {
	const attacks = [];
	let totalDamage = 0;

	livingEnemies.forEach((enemy) => {
		const turn = executeMonsterAttacks(
			enemy.level,
			enemy.monster_speed ?? 2,
			playerDR,
			enemy.modifiers || []
		);

		turn.attacks.forEach((attack) => {
			attacks.push({
				...attack,
				enemyId: enemy.id ?? enemy.enemy_id,
				enemyName: enemy.monster_name,
				enemySlot: enemy.slot_index,
			});
		});
		totalDamage += turn.totalDamage;
	});

	return { attacks, totalDamage };
}

function syncPrimaryEnemyFields(enemies = []) {
	const primary = enemies[0] || null;
	if (!primary) {
		return {
			health: 0,
			monster_id: null,
			monster_name: '',
			level: 0,
			life_regen: 0,
			damage_reduction: 0,
			monster_speed: 0,
			item_quantity: 0,
			item_rarity: 0,
			roll_attempt: 0,
		};
	}

	const living = getLivingEnemies(enemies);
	const health = living.reduce((sum, enemy) => sum + Math.max(0, Number(enemy.health) || 0), 0);

	return {
		health,
		monster_id: primary.monster_id,
		monster_name: primary.monster_name,
		level: primary.level,
		life_regen: primary.life_regen,
		damage_reduction: primary.damage_reduction,
		monster_speed: primary.monster_speed,
		item_quantity: primary.item_quantity,
		item_rarity: primary.item_rarity,
		roll_attempt: primary.roll_attempt,
	};
}

function resolveCombatAction(instance, playerRoll, targetEnemyId = null) {
	if ((instance.active_turn || 'player') !== 'player') {
		throw new Error('It is not your turn');
	}

	if ((instance.attacks_remaining ?? 0) <= 0) {
		throw new Error('No rolls remaining this round');
	}

	const enemies = (instance.enemies || []).map((enemy) => ({ ...enemy }));
	if (!enemies.length) {
		throw new Error('No enemies in this delve');
	}

	const target = resolveTargetEnemy(enemies, targetEnemyId);
	if (!target) {
		throw new Error('No valid target enemy');
	}

	let playerHealth = instance.player_health ?? instance.player_max_health ?? 100;
	let attacksRemaining = instance.attacks_remaining ?? instance.player_speed ?? 1;
	let activeTurn = 'player';
	let status = 'in progress';
	let monsterTurn = null;
	let playerRegenApplied = 0;

	const rawDamageToMonster = applyMonsterDamageFromPlayerRoll(
		playerRoll.rollResult,
		target.damage_reduction,
		target.life_regen,
		instance.damage_reduction_penetration ?? 0
	);
	const playerDamageToMonster = rawDamageToMonster;

	const targetIndex = enemies.findIndex(
		(enemy) => String(enemy.id ?? enemy.enemy_id) === String(target.id ?? target.enemy_id)
	);
	if (targetIndex === -1) {
		throw new Error('Target enemy not found');
	}

	let targetHealth = Math.max(0, Number(enemies[targetIndex].health) - playerDamageToMonster);
	enemies[targetIndex].health = targetHealth;
	if (targetHealth <= 0) {
		enemies[targetIndex].status = 'dead';
	}

	attacksRemaining = Math.max(0, attacksRemaining - 1);

	if (allEnemiesDead(enemies)) {
		status = 'completed';
	} else if (attacksRemaining <= 0) {
		const livingEnemies = getLivingEnemies(enemies);
		monsterTurn = executeAllMonsterAttacks(livingEnemies, instance.player_damage_reduction ?? 0);
		playerHealth = Math.max(0, playerHealth - monsterTurn.totalDamage);
		activeTurn = 'player';
		attacksRemaining = instance.player_speed ?? 1;

		const playerRegen = Number(instance.player_life_regen || 0);
		if (playerRegen > 0 && playerHealth > 0) {
			const beforeRegen = playerHealth;
			playerHealth = Math.min(instance.player_max_health ?? playerHealth, playerHealth + playerRegen);
			playerRegenApplied = playerHealth - beforeRegen;
		}

		if (playerHealth <= 0) {
			status = 'completed';
		}
	}

	const primaryFields = syncPrimaryEnemyFields(enemies);

	return {
		enemies,
		targetEnemyId: target.id ?? target.enemy_id,
		playerDamageToMonster,
		playerRegenApplied,
		monsterTurn,
		playerHealth,
		attacksRemaining,
		activeTurn,
		status,
		...primaryFields,
	};
}

module.exports = {
	executeAllMonsterAttacks,
	resolveCombatAction,
	syncPrimaryEnemyFields,
};
