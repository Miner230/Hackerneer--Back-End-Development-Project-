const pool = require('../services/db');

// Get all loot items
module.exports.selectAllLoot = (callback) => {
	const SQLSTATMENT = `
        SELECT * FROM loot;
    `;
	pool.query(SQLSTATMENT, callback);
};

// Add loot to inventory, or increment quantity if already exists
module.exports.addLoot = (data, callback) => {
	const SQLSTATMENT = `
        INSERT INTO inventory (user_id, loot_id, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity);
    `;
	const VALUES = [data.userId, data.lootId, data.quantity];
	pool.query(SQLSTATMENT, VALUES, callback);
};

module.exports.setInventoryQuantity = (data, callback) => {
	const SQLSTATMENT = `
        INSERT INTO inventory (user_id, loot_id, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);
    `;
	const VALUES = [data.userId, data.lootId, data.quantity];
	pool.query(SQLSTATMENT, VALUES, callback);
};

module.exports.selectStackableLoot = (callback) => {
	const SQLSTATMENT = `
        SELECT id, name, mechanic
        FROM loot
        WHERE mechanic != 'equip_dice';
    `;
	pool.query(SQLSTATMENT, callback);
};

module.exports.selectDiceLoot = (callback) => {
	const SQLSTATMENT = `
        SELECT id, name
        FROM loot
        WHERE mechanic = 'equip_dice';
    `;
	pool.query(SQLSTATMENT, callback);
};

// Modify a stat dynamically based on loot mechanic
module.exports.modifyByMechanics = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE ??
        SET ?? = ?? + ?
        WHERE ?? = ?;
    `;
	const VALUES = [data.table, data.row, data.row, data.stat, data.indexName, data.userId];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Decrease item quantity in inventory after use
module.exports.decrementQnt = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE inventory
        SET quantity = quantity - 1
        WHERE user_id = ? AND loot_id = ? AND quantity > 0;
    `;
	const VALUES = [data.userId, data.lootId];
	pool.query(SQLSTATMENT, VALUES, callback);
};

module.exports.selectLootIdByName = (data, callback) => {
	const SQLSTATMENT = `
        SELECT id FROM loot WHERE name = ? LIMIT 1;
    `;
	pool.query(SQLSTATMENT, [data.name], callback);
};
