const pool = require('../services/db');

module.exports.selectByDiceInstanceId = (data, callback) => {
	const SQLSTATMENT = `
        SELECT
            dice_socketed_items.*,
            loot.name AS source_name,
            loot.stat_description AS source_stat_description,
            loot.statline AS source_statline
        FROM dice_socketed_items
        LEFT JOIN loot ON loot.id = dice_socketed_items.source_loot_id
        WHERE dice_socketed_items.user_id = ? AND dice_socketed_items.dice_instance_id = ?
        ORDER BY dice_socketed_items.slot_index ASC, dice_socketed_items.id ASC;
    `;
	pool.query(SQLSTATMENT, [data.userId, data.diceInstanceId], callback);
};

module.exports.selectAllByUserId = (data, callback) => {
	const SQLSTATMENT = `
        SELECT
            dice_socketed_items.*,
            loot.name AS source_name,
            loot.stat_description AS source_stat_description,
            loot.statline AS source_statline
        FROM dice_socketed_items
        LEFT JOIN loot ON loot.id = dice_socketed_items.source_loot_id
        WHERE dice_socketed_items.user_id = ?
        ORDER BY dice_socketed_items.dice_instance_id ASC, dice_socketed_items.slot_index ASC;
    `;
	pool.query(SQLSTATMENT, [data.userId], callback);
};

module.exports.countByDiceInstanceId = (data, callback) => {
	const SQLSTATMENT = `
        SELECT COUNT(*) AS count
        FROM dice_socketed_items
        WHERE user_id = ? AND dice_instance_id = ?;
    `;
	pool.query(SQLSTATMENT, [data.userId, data.diceInstanceId], callback);
};

module.exports.insertSocketItem = (data, callback) => {
	const SQLSTATMENT = `
        INSERT INTO dice_socketed_items
            (user_id, dice_instance_id, slot_index, mechanic, rolled_value, source_loot_id, source_rarity)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
	const VALUES = [
		data.userId,
		data.diceInstanceId,
		data.slotIndex,
		data.mechanic,
		data.rolledValue,
		data.sourceLootId,
		data.sourceRarity,
	];
	pool.query(SQLSTATMENT, VALUES, callback);
};
