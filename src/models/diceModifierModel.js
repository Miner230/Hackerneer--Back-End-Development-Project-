const pool = require('../services/db');

module.exports.selectByDiceInstanceId = (data, callback) => {
	const SQLSTATMENT = `
        SELECT
            dice_modifiers.*,
            loot.name AS source_name
        FROM dice_modifiers
        LEFT JOIN loot ON loot.id = dice_modifiers.source_loot_id
        WHERE dice_modifiers.user_id = ? AND dice_modifiers.dice_instance_id = ?
        ORDER BY
            CASE dice_modifiers.affix_type WHEN 'prefix' THEN 0 ELSE 1 END,
            dice_modifiers.id ASC;
    `;
	pool.query(SQLSTATMENT, [data.userId, data.diceInstanceId], callback);
};

module.exports.countByDiceInstanceId = (data, callback) => {
	const SQLSTATMENT = `
        SELECT COUNT(*) AS count
        FROM dice_modifiers
        WHERE user_id = ? AND dice_instance_id = ?;
    `;
	pool.query(SQLSTATMENT, [data.userId, data.diceInstanceId], callback);
};

module.exports.countByAffixType = (data, callback) => {
	const SQLSTATMENT = `
        SELECT COUNT(*) AS count
        FROM dice_modifiers
        WHERE user_id = ? AND dice_instance_id = ? AND affix_type = ?;
    `;
	pool.query(SQLSTATMENT, [data.userId, data.diceInstanceId, data.affixType], callback);
};

module.exports.selectByFamily = (data, callback) => {
	const SQLSTATMENT = `
        SELECT *
        FROM dice_modifiers
        WHERE user_id = ? AND dice_instance_id = ? AND essence_family = ?
        LIMIT 1;
    `;
	pool.query(SQLSTATMENT, [data.userId, data.diceInstanceId, data.essenceFamily], callback);
};

module.exports.insertModifier = (data, callback) => {
	const SQLSTATMENT = `
        INSERT INTO dice_modifiers
            (user_id, dice_instance_id, affix_type, slot_index, essence_mechanic, essence_family, modifier_name, rolled_value, source_loot_id, source_rarity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
	const VALUES = [
		data.userId,
		data.diceInstanceId,
		data.affixType,
		data.slotIndex ?? 0,
		data.essenceMechanic,
		data.essenceFamily,
		data.modifierName,
		data.rolledValue,
		data.sourceLootId,
		data.sourceRarity,
	];
	pool.query(SQLSTATMENT, VALUES, callback);
};

module.exports.selectAllByUserId = (data, callback) => {
	const SQLSTATMENT = `
        SELECT
            dice_modifiers.*,
            loot.name AS source_name
        FROM dice_modifiers
        LEFT JOIN loot ON loot.id = dice_modifiers.source_loot_id
        WHERE dice_modifiers.user_id = ?
        ORDER BY
            dice_modifiers.dice_instance_id ASC,
            CASE dice_modifiers.affix_type WHEN 'prefix' THEN 0 ELSE 1 END,
            dice_modifiers.id ASC;
    `;
	pool.query(SQLSTATMENT, [data.userId], callback);
};

module.exports.updateModifier = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE dice_modifiers
        SET
            essence_mechanic = ?,
            modifier_name = ?,
            rolled_value = ?,
            source_loot_id = ?,
            source_rarity = ?
        WHERE id = ? AND user_id = ?;
    `;
	const VALUES = [
		data.essenceMechanic,
		data.modifierName,
		data.rolledValue,
		data.sourceLootId,
		data.sourceRarity,
		data.modifierId,
		data.userId,
	];
	pool.query(SQLSTATMENT, VALUES, callback);
};

module.exports.deleteById = (data, callback) => {
	const SQLSTATMENT = `
        DELETE FROM dice_modifiers
        WHERE id = ? AND user_id = ?;
    `;
	pool.query(SQLSTATMENT, [data.id, data.userId], callback);
};
