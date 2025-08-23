const pool = require('../services/db');

// Get full inventory for a user
module.exports.selectInventoryById = (data, callback) => {
	const SQLSTATMENT = `
        SELECT inventory.*, Loot.name, Loot.mechanic, Loot.stat_description, Loot.statline, Loot.lore, Loot.rarity
        FROM inventory
        JOIN Loot ON inventory.loot_id = Loot.id
        WHERE inventory.user_id = ?;
    `;
	const VALUES = [data.userId];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Get a specific item from a user's inventory
module.exports.getItemFromInventory = (data, callback) => {
	const SQLSTATMENT = `
        SELECT inventory.*, Loot.name, Loot.mechanic, Loot.stat_description, Loot.statline, Loot.lore, Loot.craft_cost, Loot.rarity
        FROM inventory
        JOIN Loot ON inventory.loot_id = Loot.id
        WHERE inventory.user_id = ? AND inventory.loot_id = ?;
    `;
	const VALUES = [data.userId, data.lootId];
	pool.query(SQLSTATMENT, VALUES, callback);
};
