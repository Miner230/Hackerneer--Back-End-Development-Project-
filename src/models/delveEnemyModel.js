const pool = require('../services/db');

module.exports.selectEnemiesByDelveId = (delveId, callback) => {
	const SQL = `
		SELECT
			de.id AS enemy_id,
			de.delve_instance_id,
			de.slot_index,
			de.monster_id,
			de.monster_name,
			m.description AS monster_description,
			de.level,
			de.max_health,
			de.health,
			de.life_regen,
			de.damage_reduction,
			de.roll_attempt,
			de.item_quantity,
			de.item_rarity,
			de.monster_speed,
			de.status,
			dm.delve_enemy_id,
			mm.id AS modifier_id,
			mm.name AS modifier_name,
			mm.description AS modifier_description
		FROM delve_enemies de
		JOIN monsters m ON de.monster_id = m.id
		LEFT JOIN delve_modifiers dm ON dm.delve_enemy_id = de.id
		LEFT JOIN monster_modifiers mm ON mm.id = dm.modifier_id
		WHERE de.delve_instance_id = ?
		ORDER BY de.slot_index ASC, mm.id ASC
	`;
	pool.query(SQL, [delveId], callback);
};

module.exports.insertDelveEnemy = (data, callback) => {
	const SQL = `
		INSERT INTO delve_enemies (
			delve_instance_id, slot_index, monster_id, monster_name,
			level, max_health, health, life_regen, damage_reduction,
			roll_attempt, item_quantity, item_rarity, monster_speed, status
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'alive')
	`;
	const VALUES = [
		data.delve_instance_id,
		data.slot_index,
		data.monster_id,
		data.monster_name,
		data.level,
		data.max_health,
		data.health,
		data.life_regen,
		data.damage_reduction,
		data.roll_attempt,
		data.item_quantity,
		data.item_rarity,
		data.monster_speed,
	];
	pool.query(SQL, VALUES, callback);
};

module.exports.insertDelveEnemyModifiers = (data, callback) => {
	const { enemyId, modifierIds } = data;
	if (!Array.isArray(modifierIds) || modifierIds.length === 0) {
		return callback(null, []);
	}

	const VALUES = modifierIds.map((modId) => [data.delveId, modId, enemyId]);
	const SQL = `
		INSERT INTO delve_modifiers (delve_instance_id, modifier_id, delve_enemy_id)
		VALUES ?
	`;
	pool.query(SQL, [VALUES], callback);
};

module.exports.updateDelveEnemy = (data, callback) => {
	const SQL = `
		UPDATE delve_enemies
		SET health = ?, status = ?
		WHERE id = ? AND delve_instance_id = ?
	`;
	pool.query(SQL, [data.health, data.status, data.id, data.delve_instance_id], callback);
};

module.exports.updateDelveInstanceCombat = (data, callback) => {
	const SQL = `
		UPDATE delve_instances
		SET health = ?,
			monster_id = ?,
			monster_name = ?,
			level = ?,
			life_regen = ?,
			damage_reduction = ?,
			monster_speed = ?,
			item_quantity = ?,
			item_rarity = ?,
			roll_attempt = ?,
			player_health = ?,
			active_turn = ?,
			attacks_remaining = ?,
			status = ?
		WHERE id = ?
	`;
	const VALUES = [
		data.health,
		data.monster_id,
		data.monster_name,
		data.level,
		data.life_regen,
		data.damage_reduction,
		data.monster_speed,
		data.item_quantity,
		data.item_rarity,
		data.roll_attempt,
		data.player_health,
		data.active_turn,
		data.attacks_remaining,
		data.status,
		data.id,
	];
	pool.query(SQL, VALUES, callback);
};

module.exports.selectDelveInstanceHeader = (data, callback) => {
	const SQL = `
		SELECT
			d.id AS delve_id,
			d.user_id,
			d.monster_id,
			d.monster_name,
			m.description AS monster_description,
			d.level,
			d.health,
			d.life_regen,
			d.damage_reduction,
			d.roll_attempt,
			d.item_quantity,
			d.item_rarity,
			d.player_health,
			d.player_max_health,
			d.player_damage_reduction,
			d.player_life_regen,
			d.damage_reduction_penetration,
			d.player_speed,
			d.monster_speed,
			d.active_turn,
			d.attacks_remaining,
			d.status
		FROM delve_instances d
		JOIN monsters m ON d.monster_id = m.id
		WHERE d.id = ?
	`;
	pool.query(SQL, [data.id], callback);
};
