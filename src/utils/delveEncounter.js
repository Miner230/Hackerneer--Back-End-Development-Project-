const {
	selectMonsterRandomly,
	computeMonsterLevel,
	selectMonsterModifiersRandomly,
	scaleMonster,
} = require('../middleware/delveConfigs.js');

const MIN_ENCOUNTER_SIZE = 1;
const MAX_ENCOUNTER_SIZE = 5;

function clampEncounterCount(value) {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed)) return 1;
	return Math.min(MAX_ENCOUNTER_SIZE, Math.max(MIN_ENCOUNTER_SIZE, parsed));
}

/** Build encounter weights for counts 1–5; slot 0 is always heaviest. */
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

function pickEncounterCountFromWeights(weights, randomFn = Math.random) {
	const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
	let roll = randomFn() * total;
	for (let i = 0; i < weights.length; i += 1) {
		roll -= Math.max(0, weights[i]);
		if (roll <= 0) return i + 1;
	}
	return 1;
}

/** Weighted roll for 1–5 enemies; 1 is always the heaviest weight, higher counts rise with depth. */
function rollEncounterCount(depth = 0, roomType = null) {
	return pickEncounterCountFromWeights(buildEncounterWeights(depth, roomType), Math.random);
}

/** Seeded roll — used when generating dungeon floors so map counts match combat. */
function rollEncounterCountFromRng(depth = 0, roomType = null, rng = Math.random) {
	const randomFn = typeof rng === 'function' ? rng : () => Math.random();
	return pickEncounterCountFromWeights(buildEncounterWeights(depth, roomType), randomFn);
}

/** Parse ?count=N from createInstance — defaults to one random enemy. */
function parseEncounterSpec(req = {}) {
	const count = clampEncounterCount(req.query?.count);
	return { count };
}

function spawnScaledEnemy(monsterPool, modifierPool, user, options = {}) {
	if (!monsterPool?.length) {
		throw new Error('No monsters found in database');
	}
	if (!modifierPool?.length) {
		throw new Error('No monster modifiers found in database');
	}

	const selectedMonster = selectMonsterRandomly(monsterPool, user);
	const levelOffset = Number(options.levelOffset) || 0;
	const monsterLevel = computeMonsterLevel(user) + levelOffset;
	const selectedModifiers = selectMonsterModifiersRandomly(modifierPool, monsterLevel);
	const scaled = scaleMonster(selectedMonster, user, selectedModifiers, monsterLevel);

	return {
		monster: selectedMonster,
		modifiers: selectedModifiers,
		modifierIds: selectedModifiers.map((mod) => mod.id),
		level: scaled.level,
		health: scaled.health,
		max_health: scaled.health,
		life_regen: scaled.life_regen,
		damage_reduction: scaled.damage_reduction,
		roll_attempt: scaled.rollAttempt,
		item_quantity: scaled.itemQuantity,
		item_rarity: scaled.itemRarity,
		monster_name: scaled.moddedMonsterName,
		monster_speed: scaled.monster_speed,
	};
}
/** Roll N independent enemies for a delve encounter. */
function buildEncounter(monsterPool, modifierPool, user, spec = { count: 1 }) {
	const count = clampEncounterCount(spec?.count);
	const enemies = [];

	for (let slot = 0; slot < count; slot += 1) {
		const levelOffset = count > 1 && slot > 0 ? Math.floor(Math.random() * 3) - 1 : 0;
		const spawned = spawnScaledEnemy(monsterPool, modifierPool, user, { levelOffset });
		enemies.push({
			slot_index: slot,
			monster_id: spawned.monster.id,
			monster_name: spawned.monster_name,
			monster_description: spawned.monster.description,
			level: spawned.level,
			health: spawned.health,
			max_health: spawned.max_health,
			life_regen: spawned.life_regen,
			damage_reduction: spawned.damage_reduction,
			roll_attempt: spawned.roll_attempt,
			item_quantity: spawned.item_quantity,
			item_rarity: spawned.item_rarity,
			monster_speed: spawned.monster_speed,
			modifiers: spawned.modifiers,
			modifierIds: spawned.modifierIds,
		});
	}

	return enemies;
}

function aggregateEnemyLoot(enemies = []) {
	return enemies.reduce(
		(acc, enemy) => ({
			item_quantity: acc.item_quantity + Number(enemy.item_quantity || 0),
			item_rarity: acc.item_rarity + Number(enemy.item_rarity || 0),
		}),
		{ item_quantity: 0, item_rarity: 0 }
	);
}

function aggregateEnemyXpLevel(enemies = []) {
	if (!enemies.length) return 1;
	const total = enemies.reduce((sum, enemy) => sum + Math.max(1, Number(enemy.level) || 1), 0);
	return Math.max(1, Math.round(total / enemies.length));
}

function allEnemiesDead(enemies = []) {
	if (!enemies.length) return false;
	return enemies.every((enemy) => enemy.status === 'dead' || Number(enemy.health) <= 0);
}

function getLivingEnemies(enemies = []) {
	return enemies.filter((enemy) => enemy.status !== 'dead' && Number(enemy.health) > 0);
}

function pickDefaultTargetEnemyId(enemies = []) {
	const living = getLivingEnemies(enemies);
	if (!living.length) return null;
	return living[0].id ?? living[0].enemy_id ?? null;
}

function resolveTargetEnemy(enemies = [], targetEnemyId) {
	const living = getLivingEnemies(enemies);
	if (!living.length) return null;

	if (targetEnemyId != null) {
		const match = living.find(
			(enemy) => String(enemy.id ?? enemy.enemy_id) === String(targetEnemyId)
		);
		if (match) return match;
	}

	return living[0];
}

module.exports = {
	MIN_ENCOUNTER_SIZE,
	MAX_ENCOUNTER_SIZE,
	buildEncounterWeights,
	pickEncounterCountFromWeights,
	rollEncounterCount,
	rollEncounterCountFromRng,
	clampEncounterCount,
	parseEncounterSpec,
	buildEncounter,
	aggregateEnemyLoot,
	aggregateEnemyXpLevel,
	allEnemiesDead,
	getLivingEnemies,
	pickDefaultTargetEnemyId,
	resolveTargetEnemy,
};
