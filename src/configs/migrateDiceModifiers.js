const pool = require('../services/db');

pool.query(
	`CREATE TABLE IF NOT EXISTS dice_modifiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    dice_loot_id INT NOT NULL,
    slot_index INT NOT NULL,
    essence_mechanic VARCHAR(64) NOT NULL,
    essence_family VARCHAR(64) NOT NULL,
    modifier_name VARCHAR(128) NOT NULL,
    rolled_value INT NOT NULL,
    source_loot_id INT NOT NULL,
    source_rarity VARCHAR(32) NOT NULL,
    UNIQUE KEY uniq_dice_family (user_id, dice_loot_id, essence_family),
    UNIQUE KEY uniq_dice_slot (user_id, dice_loot_id, slot_index)
  )`,
	(error) => {
		if (error) {
			console.error('Dice modifiers migration failed:', error.message);
			return process.exit(1);
		}

		console.log('Dice modifiers table migrated successfully.');
		process.exit(0);
	}
);
