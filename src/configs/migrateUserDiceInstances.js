const pool = require('../services/db');

function runStep(sql, values, callback) {
	pool.query(sql, values, callback);
}

function columnExists(table, column, callback) {
	pool.query(
		`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
		[table, column],
		(error, results) => {
			if (error) return callback(error);
			callback(null, results.length > 0);
		}
	);
}

function tableExists(table, callback) {
	pool.query(
		`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
		[table],
		(error, results) => {
			if (error) return callback(error);
			callback(null, results.length > 0);
		}
	);
}

function migrateInventoryDiceToUserDice(callback) {
	pool.query(
		`SELECT inventory.user_id, inventory.loot_id, inventory.quantity
     FROM inventory
     INNER JOIN loot ON loot.id = inventory.loot_id
     WHERE loot.mechanic = 'equip_dice' AND inventory.quantity > 0`,
		(error, rows) => {
			if (error) return callback(error);
			if (!rows.length) return callback(null);

			let index = 0;

			const insertNext = (insertError) => {
				if (insertError) return callback(insertError);
				if (index >= rows.length) return callback(null);

				const row = rows[index];
				index += 1;
				let remaining = Math.max(1, Number(row.quantity) || 1);

				const insertOne = (oneError) => {
					if (oneError) return callback(oneError);
					remaining -= 1;
					if (remaining > 0) {
						return runStep(
							'INSERT INTO user_dice (user_id, loot_id) VALUES (?, ?)',
							[row.user_id, row.loot_id],
							insertOne
						);
					}
					insertNext(null);
				};

				runStep(
					'INSERT INTO user_dice (user_id, loot_id) VALUES (?, ?)',
					[row.user_id, row.loot_id],
					insertOne
				);
			};

			insertNext(null);
		}
	);
}

function migrateEquippedDiceId(callback) {
	pool.query(
		`SELECT id, equipped_dice_loot_id
     FROM user
     WHERE equipped_dice_loot_id IS NOT NULL`,
		(error, users) => {
			if (error) return callback(error);

			let index = 0;

			const nextUser = (userError) => {
				if (userError) return callback(userError);
				if (index >= users.length) return callback(null);

				const user = users[index];
				index += 1;

				pool.query(
					`SELECT id FROM user_dice
           WHERE user_id = ? AND loot_id = ?
           ORDER BY id ASC
           LIMIT 1`,
					[user.id, user.equipped_dice_loot_id],
					(diceError, diceRows) => {
						if (diceError) return callback(diceError);
						if (!diceRows.length) return nextUser(null);

						runStep(
							'UPDATE user SET equipped_dice_id = ? WHERE id = ?',
							[diceRows[0].id, user.id],
							nextUser
						);
					}
				);
			};

			nextUser(null);
		}
	);
}

function migrateModifierInstanceIds(callback) {
	columnExists('dice_modifiers', 'dice_instance_id', (existsError, hasInstanceColumn) => {
		if (existsError) return callback(existsError);
		if (hasInstanceColumn) return callback(null);

		runStep(
			'ALTER TABLE dice_modifiers ADD COLUMN dice_instance_id INT NULL AFTER user_id',
			[],
			(addColError) => {
				if (addColError) return callback(addColError);

				pool.query(
					`SELECT id, user_id, dice_loot_id
         FROM dice_modifiers
         WHERE dice_instance_id IS NULL`,
					(modError, modifiers) => {
						if (modError) return callback(modError);

						let index = 0;

						const nextModifier = (updateError) => {
							if (updateError) return callback(updateError);
							if (index >= modifiers.length) {
								return runStep(
									'ALTER TABLE dice_modifiers DROP INDEX uniq_dice_family, DROP INDEX uniq_dice_slot',
									[],
									(dropIndexError) => {
										if (dropIndexError && dropIndexError.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
											return callback(dropIndexError);
										}

										runStep(
											'ALTER TABLE dice_modifiers DROP COLUMN dice_loot_id',
											[],
											(dropColError) => {
												if (dropColError && dropColError.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
													return callback(dropColError);
												}

												runStep(
													`ALTER TABLE dice_modifiers
                           MODIFY dice_instance_id INT NOT NULL,
                           ADD UNIQUE KEY uniq_dice_family (user_id, dice_instance_id, essence_family),
                           ADD UNIQUE KEY uniq_dice_slot (user_id, dice_instance_id, slot_index)`,
													[],
													callback
												);
											}
										);
									}
								);
							}

							const modifier = modifiers[index];
							index += 1;

							pool.query(
								`SELECT ud.id
             FROM user_dice ud
             LEFT JOIN user u ON u.id = ud.user_id
             WHERE ud.user_id = ? AND ud.loot_id = ?
             ORDER BY CASE WHEN u.equipped_dice_id = ud.id THEN 0 ELSE 1 END, ud.id ASC
             LIMIT 1`,
								[modifier.user_id, modifier.dice_loot_id],
								(resolveError, diceRows) => {
									if (resolveError) return callback(resolveError);
									if (!diceRows.length) return nextModifier(null);

									runStep(
										'UPDATE dice_modifiers SET dice_instance_id = ? WHERE id = ?',
										[diceRows[0].id, modifier.id],
										nextModifier
									);
								}
							);
						};

						nextModifier(null);
					}
				);
			}
		);
	});
}

tableExists('user_dice', (tableError, hasUserDice) => {
	if (tableError) {
		console.error('User dice migration failed:', tableError.message);
		return process.exit(1);
	}

	const createTableStep = hasUserDice
		? (cb) => cb(null)
		: (cb) =>
				runStep(
					`CREATE TABLE user_dice (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          loot_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
					[],
					cb
				);

	createTableStep((createError) => {
		if (createError) {
			console.error('User dice migration failed:', createError.message);
			return process.exit(1);
		}

		migrateInventoryDiceToUserDice((inventoryError) => {
			if (inventoryError) {
				console.error('User dice migration failed:', inventoryError.message);
				return process.exit(1);
			}

			runStep(
				`DELETE inventory FROM inventory
         INNER JOIN loot ON loot.id = inventory.loot_id
         WHERE loot.mechanic = 'equip_dice'`,
				[],
				(deleteError) => {
					if (deleteError) {
						console.error('User dice migration failed:', deleteError.message);
						return process.exit(1);
					}

					columnExists('user', 'equipped_dice_id', (equippedColError, hasEquippedId) => {
						if (equippedColError) {
							console.error('User dice migration failed:', equippedColError.message);
							return process.exit(1);
						}

						const addEquippedColumn = hasEquippedId
							? (cb) => cb(null)
							: (cb) =>
									runStep('ALTER TABLE user ADD COLUMN equipped_dice_id INT NULL', [], cb);

						addEquippedColumn((addColError) => {
							if (addColError) {
								console.error('User dice migration failed:', addColError.message);
								return process.exit(1);
							}

							migrateEquippedDiceId((equippedError) => {
								if (equippedError) {
									console.error('User dice migration failed:', equippedError.message);
									return process.exit(1);
								}

								migrateModifierInstanceIds((modifierError) => {
									if (modifierError) {
										console.error('User dice migration failed:', modifierError.message);
										return process.exit(1);
									}

									console.log('Unique user dice instances migrated successfully.');
									process.exit(0);
								});
							});
						});
					});
				}
			);
		});
	});
});
