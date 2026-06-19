const pool = require('../services/db');

// Get all monsters
module.exports.selectAllMonsters = (callback) => {
	const SQLSTATMENT = `
        SELECT * FROM monsters
    `;
	pool.query(SQLSTATMENT, callback);
};

// Get all delve instances for a user
module.exports.selectAllDelveInstance = (data, callback) => {
	const SQLSTATMENT = `
        SELECT id, monster_id, monster_name, level, health, roll_attempt, item_quantity, item_rarity
        FROM delve_instances 
        WHERE user_id = ?
    `;
	const VALUES = [data.userId];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Get a specific delve instance by user ID and delve ID
module.exports.selectDelveInstanceById = (data, callback) => {
	const SQLSTATMENT = `
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
            d.status,
            mm.id AS modifier_id,
            mm.name AS modifier_name,
            mm.description AS modifier_description
        FROM delve_instances d
        JOIN monsters m ON d.monster_id = m.id
        LEFT JOIN delve_modifiers dm ON dm.delve_instance_id = d.id
        LEFT JOIN monster_modifiers mm ON mm.id = dm.modifier_id
        WHERE d.id = ?
    `;
	const VALUES = [data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Create a new delve instance
module.exports.setDelveInstance = (data, callback) => {
	const SQLSTATMENT = `
        INSERT INTO delve_instances 
        (user_id, monster_id, monster_name, level, health, life_regen, damage_reduction, roll_attempt, item_quantity, item_rarity, player_health, player_max_health, player_damage_reduction, player_life_regen, damage_reduction_penetration, monster_attack, active_turn, player_speed, monster_speed, attacks_remaining)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'player', ?, ?, ?);
    `;
	const VALUES = [
		data.user_id,
		data.monsters_id,
		data.monsters_name,
		data.level,
		data.health,
		data.life_regen,
		data.damage_reduction,
		data.roll_attempt,
		data.item_quantity,
		data.item_rarity,
		data.player_health,
		data.player_max_health,
		data.player_damage_reduction,
		data.player_life_regen ?? 0,
		data.damage_reduction_penetration ?? 0,
		data.player_speed,
		data.monster_speed,
		data.attacks_remaining,
	];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Update a delve instance after a roll
module.exports.updateDelveInstance = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE delve_instances
        SET health = ?,
            player_health = ?,
            active_turn = ?,
            attacks_remaining = ?,
            status = ?
        WHERE id = ?;
    `;
	const VALUES = [
		data.health,
		data.player_health,
		data.active_turn,
		data.attacks_remaining,
		data.status,
		data.id,
	];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Display a delve instance with its modifiers
module.exports.displayDelve = (data, callback) => {
	const SQLSTATMENT = `
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
            d.status,
            mm.id AS modifier_id,
            mm.name AS modifier_name,
            mm.description AS modifier_description
        FROM delve_instances d
        JOIN monsters m ON d.monster_id = m.id
        LEFT JOIN delve_modifiers dm ON dm.delve_instance_id = d.id
        LEFT JOIN monster_modifiers mm ON mm.id = dm.modifier_id
        WHERE d.id = ?
    `;
	const VALUES = [data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Insert modifier relationships for a delve instance
module.exports.insertDelveModifiers = (data, callback) => {
	const { delveId, modifierIds } = data;

	if (!Array.isArray(modifierIds) || modifierIds.length === 0) {
		return callback(null, []);
	}

	const VALUES = modifierIds.map((modId) => [delveId, modId]);

	const SQLSTATMENT = `
        INSERT INTO delve_modifiers (delve_instance_id, modifier_id)
        VALUES ?
    `;
	pool.query(SQLSTATMENT, [VALUES], callback);
};

// Get all monster modifiers
module.exports.selectAllMonsterModifiers = (callback) => {
	const SQLSTATMENT = `
        SELECT * FROM monster_modifiers
    `;
	pool.query(SQLSTATMENT, callback);
};

// Get the current status of a delve instance
module.exports.getDelveStatus = (data, callback) => {
	const SQLSTATMENT = `
        SELECT status FROM delve_instances WHERE id = ?
    `;
	const VALUES = [data.delveId];
	pool.query(SQLSTATMENT, VALUES, callback);
};
