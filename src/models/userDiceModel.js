const pool = require('../services/db');

const { rollDiceSocketCount } = require('../utils/diceSockets.js');

module.exports.addUserDice = (data, callback) => {
	const SQLSTATMENT = `
        INSERT INTO user_dice (user_id, loot_id, item_level, socket_count, drop_rarity_score)
        VALUES (?, ?, ?, ?, ?);
    `;
	const socketCount = Number.isFinite(data.socketCount)
		? Math.max(1, Math.min(6, data.socketCount))
		: rollDiceSocketCount();
	pool.query(
		SQLSTATMENT,
		[
			data.userId,
			data.lootId,
			Math.max(1, Number(data.itemLevel) || 1),
			socketCount,
			Math.max(0, Number(data.dropRarityScore) || 100),
		],
		callback
	);
};

module.exports.selectByUserId = (data, callback) => {
	const SQLSTATMENT = `
        SELECT
            user_dice.id,
            user_dice.user_id,
            user_dice.loot_id,
            user_dice.item_level,
            user_dice.socket_count,
            user_dice.drop_rarity_score,
            user_dice.created_at,
            loot.name,
            loot.mechanic,
            loot.stat_description,
            loot.statline,
            loot.lore,
            loot.rarity,
            loot.craft_cost,
            dice_gear.image_key,
            dice_gear.side_1,
            dice_gear.side_2,
            dice_gear.side_3,
            dice_gear.side_4,
            dice_gear.side_5,
            dice_gear.side_6,
            dice_gear.no_of_rolls,
            dice_gear.duplication_chance,
            dice_gear.duplication_number,
            dice_gear.crit_chance,
            dice_gear.crit_power,
            dice_gear.flat_damage AS base_flat_damage
        FROM user_dice
        INNER JOIN loot ON loot.id = user_dice.loot_id
        LEFT JOIN dice_gear ON dice_gear.loot_id = user_dice.loot_id
        WHERE user_dice.user_id = ?
        ORDER BY user_dice.id ASC;
    `;
	pool.query(SQLSTATMENT, [data.userId], callback);
};

module.exports.selectById = (data, callback) => {
	const SQLSTATMENT = `
        SELECT
            user_dice.id,
            user_dice.user_id,
            user_dice.loot_id,
            user_dice.item_level,
            user_dice.socket_count,
            user_dice.drop_rarity_score,
            user_dice.created_at,
            loot.name,
            loot.mechanic,
            loot.stat_description,
            loot.statline,
            loot.lore,
            loot.rarity,
            loot.craft_cost,
            dice_gear.image_key,
            dice_gear.side_1,
            dice_gear.side_2,
            dice_gear.side_3,
            dice_gear.side_4,
            dice_gear.side_5,
            dice_gear.side_6,
            dice_gear.no_of_rolls,
            dice_gear.duplication_chance,
            dice_gear.duplication_number,
            dice_gear.crit_chance,
            dice_gear.crit_power,
            dice_gear.flat_damage AS base_flat_damage,
            (
                SELECT COUNT(*)
                FROM dice_socketed_items
                WHERE dice_socketed_items.user_id = user_dice.user_id
                  AND dice_socketed_items.dice_instance_id = user_dice.id
            ) AS used_socket_count
        FROM user_dice
        INNER JOIN loot ON loot.id = user_dice.loot_id
        LEFT JOIN dice_gear ON dice_gear.loot_id = user_dice.loot_id
        WHERE user_dice.id = ? AND user_dice.user_id = ?;
    `;
	pool.query(SQLSTATMENT, [data.diceInstanceId, data.userId], callback);
};

module.exports.deleteById = (data, callback) => {
	const SQLSTATMENT = `
        DELETE FROM user_dice
        WHERE id = ? AND user_id = ?;
    `;
	pool.query(SQLSTATMENT, [data.diceInstanceId, data.userId], callback);
};

module.exports.countModifiersForInstance = (data, callback) => {
	const SQLSTATMENT = `
        SELECT COUNT(*) AS count
        FROM dice_modifiers
        WHERE user_id = ? AND dice_instance_id = ?;
    `;
	pool.query(SQLSTATMENT, [data.userId, data.diceInstanceId], callback);
};
