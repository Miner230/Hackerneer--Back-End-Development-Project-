const pool = require('../services/db');

// Get full inventory for a user
module.exports.selectInventoryById = (data, callback) => {
	const SQLSTATMENT = `
        SELECT inventory.*, loot.name, loot.mechanic, loot.stat_description, loot.statline, loot.lore, loot.rarity
        FROM inventory
        JOIN loot ON inventory.loot_id = loot.id
        WHERE inventory.user_id = ?;
    `;
	const VALUES = [data.userId];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Get a specific item from a user's inventory
module.exports.getItemFromInventory = (data, callback) => {
	const SQLSTATMENT = `
        SELECT inventory.*, loot.name, loot.mechanic, loot.stat_description, loot.statline, loot.lore, loot.craft_cost, loot.rarity
        FROM inventory
        JOIN loot ON inventory.loot_id = loot.id
        WHERE inventory.user_id = ? AND inventory.loot_id = ?;
    `;
	const VALUES = [data.userId, data.lootId];
	pool.query(SQLSTATMENT, VALUES, callback);
};
