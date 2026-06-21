require('dotenv').config();

const pool = require('../services/db');
const bcrypt = require('bcrypt');

const USERNAME = 'god';
const PASSWORD = 'god';
const SALT_ROUNDS = 10;

const GOD_USER = {
	level: 100,
	level_up_cost: 300,
	voidstone_count: 100,
	loot_shard: 10_000,
	number_of_delve_completed: 0,
};

const GOD_DICE = {
	side_1: 50,
	side_2: 50,
	side_3: 50,
	side_4: 50,
	side_5: 50,
	side_6: 50,
	no_of_rolls: 15,
	duplication_chance: 100,
	duplication_number: 10,
	crit_chance: 100,
	crit_power: 50_000_000,
};

function exitWithError(message, error) {
	console.error(message, error?.message || error);
	process.exit(1);
}

function upsertDice(userId, callback) {
	pool.query('SELECT id FROM dice WHERE user_id = ?', [userId], (error, rows) => {
		if (error) return callback(error);

		const values = [
			GOD_DICE.side_1,
			GOD_DICE.side_2,
			GOD_DICE.side_3,
			GOD_DICE.side_4,
			GOD_DICE.side_5,
			GOD_DICE.side_6,
			GOD_DICE.no_of_rolls,
			GOD_DICE.duplication_chance,
			GOD_DICE.duplication_number,
			GOD_DICE.crit_chance,
			GOD_DICE.crit_power,
			userId,
		];

		if (rows.length > 0) {
			pool.query(
				`UPDATE dice
         SET side_1 = ?, side_2 = ?, side_3 = ?, side_4 = ?, side_5 = ?, side_6 = ?,
             no_of_rolls = ?, duplication_chance = ?, duplication_number = ?,
             crit_chance = ?, crit_power = ?
         WHERE user_id = ?`,
				values,
				callback
			);
			return;
		}

		pool.query(
			`INSERT INTO dice
       (side_1, side_2, side_3, side_4, side_5, side_6, no_of_rolls, duplication_chance, duplication_number, crit_chance, crit_power, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			values,
			callback
		);
	});
}

function upsertUser(passwordHash, callback) {
	pool.query('SELECT id FROM user WHERE username = ?', [USERNAME], (error, rows) => {
		if (error) return callback(error);

		const userValues = [
			passwordHash,
			GOD_USER.level,
			GOD_USER.level_up_cost,
			GOD_USER.voidstone_count,
			GOD_USER.loot_shard,
			GOD_USER.number_of_delve_completed,
		];

		if (rows.length > 0) {
			const userId = rows[0].id;
			pool.query(
				`UPDATE user
         SET password = ?, level = ?, level_up_cost = ?,
             voidstone_count = ?, loot_shard = ?, number_of_delve_completed = ?, account_role = 'god'
         WHERE id = ?`,
				[...userValues, userId],
				(updateError) => {
					if (updateError) return callback(updateError);
					upsertDice(userId, (diceError) => callback(diceError, userId, true));
				}
			);
			return;
		}

		pool.query(
			`INSERT INTO user
       (username, account_role, password, level, level_up_cost, voidstone_count, loot_shard, number_of_delve_completed)
       VALUES (?, 'god', ?, ?, ?, ?, ?, ?)`,
			[USERNAME, ...userValues],
			(insertError, results) => {
				if (insertError) return callback(insertError);
				upsertDice(results.insertId, (diceError) => callback(diceError, results.insertId, false));
			}
		);
	});
}

function run() {
	if (!process.env.JWT_PEPPER) {
		return exitWithError('JWT_PEPPER is required in your environment (.env or Railway variables).');
	}

	bcrypt.hash(PASSWORD + process.env.JWT_PEPPER, SALT_ROUNDS, (hashError, passwordHash) => {
		if (hashError) return exitWithError('Failed to hash password:', hashError);

		upsertUser(passwordHash, (error, userId, updated) => {
			if (error) return exitWithError('Failed to create god user:', error);

			console.log(updated ? 'Updated existing god user.' : 'Created god user.');
			console.log('');
			console.log('Login credentials:');
			console.log(`  username: ${USERNAME}`);
			console.log(`  password: ${PASSWORD}`);
			console.log('');
			console.log('User stats:');
			console.log(`  id: ${userId}`);
			console.log(`  level: ${GOD_USER.level}`);
			console.log(`  voidstone_count: ${GOD_USER.voidstone_count}`);
			console.log(`  loot_shard: ${GOD_USER.loot_shard}`);
			console.log('');
			console.log('Dice stats:');
			console.log(`  faces: ${GOD_DICE.side_1} (all sides)`);
			console.log(`  rolls: ${GOD_DICE.no_of_rolls}`);
			console.log(`  crit: ${GOD_DICE.crit_chance}% @ ${GOD_DICE.crit_power}% power`);
			console.log(
				`  duplication: ${GOD_DICE.duplication_chance}% chance, ${GOD_DICE.duplication_number} extra`
			);
			process.exit(0);
		});
	});
}

run();
