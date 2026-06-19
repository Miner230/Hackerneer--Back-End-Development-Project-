const pool = require('../services/db');

module.exports.selectByLootId = (data, callback) => {
	const SQLSTATMENT = `
        SELECT dice_gear.*, loot.name, loot.stat_description, loot.lore, loot.rarity
        FROM dice_gear
        INNER JOIN loot ON dice_gear.loot_id = loot.id
        WHERE dice_gear.loot_id = ?;
    `;
	pool.query(SQLSTATMENT, [data.lootId], callback);
};

module.exports.selectEquippedForUser = (data, callback) => {
	const SQLSTATMENT = `
        SELECT
            user_dice.id AS dice_instance_id,
            user_dice.loot_id,
            user_dice.item_level,
            user_dice.socket_count,
            user_dice.drop_rarity_score,
            loot.name,
            loot.rarity,
            loot.stat_description,
            loot.lore,
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
        FROM user
        LEFT JOIN user_dice ON user_dice.id = user.equipped_dice_id
        LEFT JOIN loot ON loot.id = user_dice.loot_id
        LEFT JOIN dice_gear ON dice_gear.loot_id = user_dice.loot_id
        WHERE user.id = ?;
    `;
	pool.query(SQLSTATMENT, [data.userId], callback);
};
