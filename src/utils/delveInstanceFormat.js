const {
	allEnemiesDead,
	aggregateEnemyLoot,
	aggregateEnemyXpLevel,
	getLivingEnemies,
} = require('./delveEncounter.js');

function groupModifiersByEnemyId(rows = []) {
	const grouped = new Map();

	rows.forEach((row) => {
		const enemyId = row.delve_enemy_id ?? row.enemy_id;
		if (!enemyId || !row.modifier_id) return;

		if (!grouped.has(enemyId)) grouped.set(enemyId, []);
		grouped.get(enemyId).push({
			id: row.modifier_id,
			name: row.modifier_name,
			description: row.modifier_description,
		});
	});

	return grouped;
}

function formatEnemyRow(row, modifiers = []) {
	return {
		id: row.enemy_id ?? row.id,
		slot: row.slot_index,
		monster_id: row.monster_id,
		monster_name: row.monster_name,
		monster_description: row.monster_description,
		level: row.level,
		health: row.health,
		max_health: row.max_health,
		life_regen: row.life_regen,
		damage_reduction: row.damage_reduction,
		monster_speed: row.monster_speed,
		item_quantity: row.item_quantity,
		item_rarity: row.item_rarity,
		roll_attempt: row.roll_attempt,
		status: row.status,
		modifiers,
	};
}

function mirrorLegacyMonsterFields(enemies = []) {
	const primary = enemies[0] || null;
	const living = getLivingEnemies(enemies);
	const health = living.reduce((sum, enemy) => sum + Math.max(0, Number(enemy.health) || 0), 0);
	const loot = aggregateEnemyLoot(enemies);

	if (!primary) {
		return {
			monster_id: null,
			monster_name: '',
			monster_description: '',
			level: 0,
			health: 0,
			life_regen: 0,
			damage_reduction: 0,
			monster_speed: 0,
			item_quantity: loot.item_quantity,
			item_rarity: loot.item_rarity,
			roll_attempt: 0,
			modifiers: [],
		};
	}

	return {
		monster_id: primary.monster_id,
		monster_name: primary.monster_name,
		monster_description: primary.monster_description,
		level: primary.level,
		health,
		life_regen: primary.life_regen,
		damage_reduction: primary.damage_reduction,
		monster_speed: primary.monster_speed,
		item_quantity: loot.item_quantity,
		item_rarity: loot.item_rarity,
		roll_attempt: primary.roll_attempt,
		modifiers: primary.modifiers || [],
	};
}

function collapseEnemyRows(rows = []) {
	const byId = new Map();

	rows.forEach((row) => {
		const id = row.enemy_id ?? row.id;
		if (!byId.has(id)) {
			byId.set(id, { ...row, enemy_id: id });
		}
	});

	return Array.from(byId.values()).sort((a, b) => a.slot_index - b.slot_index);
}

function formatDelveWithEnemies(delveRow, enemyRows = [], modifierRows = []) {
	const collapsed = collapseEnemyRows(enemyRows);
	let enemies;

	if (collapsed.length) {
		const modifiersByEnemy = groupModifiersByEnemyId([...enemyRows, ...modifierRows]);
		enemies = collapsed.map((row) =>
			formatEnemyRow(row, modifiersByEnemy.get(row.enemy_id ?? row.id) || [])
		);
	} else {
		enemies = [
			formatEnemyRow(
				{
					enemy_id: `legacy-${delveRow.delve_id ?? delveRow.id}`,
					slot_index: 0,
					monster_id: delveRow.monster_id,
					monster_name: delveRow.monster_name,
					monster_description: delveRow.monster_description,
					level: delveRow.level,
					max_health: delveRow.health,
					health: delveRow.health,
					life_regen: delveRow.life_regen,
					damage_reduction: delveRow.damage_reduction,
					roll_attempt: delveRow.roll_attempt,
					item_quantity: delveRow.item_quantity,
					item_rarity: delveRow.item_rarity,
					monster_speed: delveRow.monster_speed,
					status: delveRow.health > 0 ? 'alive' : 'dead',
				},
				[]
			),
		];
	}

	const legacy = mirrorLegacyMonsterFields(enemies);

	return {
		delve_id: delveRow.delve_id ?? delveRow.id,
		user_id: delveRow.user_id,
		enemies,
		...legacy,
		player_health: delveRow.player_health ?? delveRow.player_max_health ?? 100,
		player_max_health: delveRow.player_max_health ?? 100,
		player_damage_reduction: delveRow.player_damage_reduction ?? 0,
		player_life_regen: delveRow.player_life_regen ?? 0,
		damage_reduction_penetration: delveRow.damage_reduction_penetration ?? 0,
		player_speed: delveRow.player_speed ?? 1,
		active_turn: delveRow.active_turn ?? 'player',
		attacks_remaining: delveRow.attacks_remaining ?? delveRow.player_speed ?? 1,
		status: delveRow.status,
		all_enemies_dead: allEnemiesDead(enemies),
		encounter_level: aggregateEnemyXpLevel(enemies),
	};
}

function buildDelveApiPayload(formatted, playerLevel) {
	const primary = formatted.enemies?.[0];
	const monster = primary
		? {
				id: primary.monster_id,
				name: primary.monster_name,
				description: primary.monster_description,
			}
		: {
				id: formatted.monster_id,
				name: formatted.monster_name,
				description: formatted.monster_description,
			};

	return {
		id: formatted.delve_id,
		user_id: formatted.user_id,
		monster,
		enemies: formatted.enemies,
		modifiers:
			formatted.modifiers?.length > 0 ? formatted.modifiers : 'This monster has no modifiers.',
		level: formatted.level,
		health: formatted.health,
		life_regen: formatted.life_regen,
		damage_reduction: formatted.damage_reduction,
		roll_attempt: formatted.roll_attempt,
		item_quantity: formatted.item_quantity,
		item_rarity: formatted.item_rarity,
		player_health: formatted.player_health,
		player_max_health: formatted.player_max_health,
		player_damage_reduction: formatted.player_damage_reduction,
		player_life_regen: formatted.player_life_regen ?? 0,
		damage_reduction_penetration: formatted.damage_reduction_penetration ?? 0,
		player_speed: formatted.player_speed,
		monster_speed: formatted.monster_speed,
		active_turn: formatted.active_turn,
		attacks_remaining: formatted.attacks_remaining,
		status: formatted.status,
		player_level: playerLevel,
	};
}

module.exports = {
	formatDelveWithEnemies,
	buildDelveApiPayload,
	mirrorLegacyMonsterFields,
	collapseEnemyRows,
};
