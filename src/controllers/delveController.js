const model = require('../models/delveModel.js');
const enemyModel = require('../models/delveEnemyModel.js');
const {
	evaluateDelveResult,
	computePlayerCombatStats,
} = require('../middleware/delveConfigs.js');
const { resolveCombatAction } = require('../utils/delveEnemyCombat.js');
const { parseEncounterSpec, buildEncounter } = require('../utils/delveEncounter.js');
const {
	formatDelveWithEnemies,
	buildDelveApiPayload,
} = require('../utils/delveInstanceFormat.js');

function getPlayerLevel(res) {
	return Math.max(1, Number(res.locals.user_data?.[0]?.level) || 1);
}

function loadFormattedDelve(delveId, callback) {
	enemyModel.selectDelveInstanceHeader({ id: delveId }, (headerError, headerRows) => {
		if (headerError) return callback(headerError);
		if (!headerRows?.length) return callback(null, null);

		enemyModel.selectEnemiesByDelveId(delveId, (enemyError, enemyRows) => {
			if (enemyError) return callback(enemyError);
			const formatted = formatDelveWithEnemies(headerRows[0], enemyRows || []);
			callback(null, formatted);
		});
	});
}

function setFormattedDelveLocals(res, formatted) {
	res.locals.formattedDelve = formatted;
	res.locals.instance_Data = [{ ...formatted, health: formatted.health }];
}

// Read all monsters → stash in locals
module.exports.readAllMonsters = (req, res, next) => {
	const callback = (error, results) => {
		if (error) {
			console.error('Error readAllMonsters:', error);
			res.status(500).json(error);
		} else {
			res.locals.monster_data = results;
			next();
		}
	};
	model.selectAllMonsters(callback);
};

// Read all delve instances for a user
module.exports.readAllDelveInstance = (req, res, next) => {
	const data = { userId: req.params.userId };

	const callback = (error, results) => {
		if (error) {
			console.error('Error readAllServer:', error);
			res.status(500).json(error);
		} else {
			if (req.method === 'GET' && req.route.path === '/delvelist/users/:userId') {
				res.status(200).json(results);
			} else {
				next?.();
			}
		}
	};
	model.selectAllDelveInstance(data, callback);
};

// Read a single delve instance by ID (owned by current user)
module.exports.readDelveInstanceById = (req, res, next) => {
	const delveId = req.params.delveId;

	loadFormattedDelve(delveId, (error, formatted) => {
		if (error) {
			console.error('Error readDelveInstanceById:', error);
			return res.status(500).json(error);
		}
		if (!formatted) {
			return res.status(404).json({ message: 'Delve Instance not found or not owned by you' });
		}

		formatted.health = Math.max(0, formatted.health);
		setFormattedDelveLocals(res, formatted);
		res.locals.createdInstance = buildDelveApiPayload(formatted, getPlayerLevel(res));
		next();
	});
};

function insertEncounterEnemies(req, res, next) {
	const delveId = res.locals.insertId;
	const enemies = res.locals.encounterEnemies || [];

	if (!enemies.length) {
		return next();
	}

	const inserted = [];
	let index = 0;

	const insertNext = (insertError) => {
		if (insertError) {
			console.error('Error insertEncounterEnemies:', insertError);
			return res.status(500).json(insertError);
		}

		if (index >= enemies.length) {
			res.locals.insertedEnemies = inserted;
			return next();
		}

		const enemy = enemies[index];
		index += 1;

		enemyModel.insertDelveEnemy(
			{
				delve_instance_id: delveId,
				slot_index: enemy.slot_index,
				monster_id: enemy.monster_id,
				monster_name: enemy.monster_name,
				level: enemy.level,
				max_health: enemy.max_health,
				health: enemy.health,
				life_regen: enemy.life_regen,
				damage_reduction: enemy.damage_reduction,
				roll_attempt: enemy.roll_attempt,
				item_quantity: enemy.item_quantity,
				item_rarity: enemy.item_rarity,
				monster_speed: enemy.monster_speed,
			},
			(enemyError, result) => {
				if (enemyError) return insertNext(enemyError);

				const enemyId = result.insertId;
				inserted.push({ ...enemy, id: enemyId });

				enemyModel.insertDelveEnemyModifiers(
					{
						delveId,
						enemyId,
						modifierIds: enemy.modifierIds || [],
					},
					insertNext
				);
			}
		);
	};

	insertNext(null);
}

// Create a new delve instance (selects monster/modifiers, scales stats)
module.exports.createDelveInstance = (req, res, next) => {
	try {
		const encounterSpec = parseEncounterSpec(req);
		const user = res.locals.user_data[0];
		const enemies = buildEncounter(
			res.locals.monster_data,
			res.locals.modifier_data,
			user,
			encounterSpec
		);

		res.locals.encounterEnemies = enemies;
		res.locals.encounterSpec = encounterSpec;

		const primary = enemies[0];
		Object.assign(res.locals, {
			selectedMonsters: { id: primary.monster_id, name: primary.monster_name, description: primary.monster_description },
			selectedModifiers: primary.modifiers,
			selectedModifierIds: primary.modifierIds,
			monsters_level: primary.level,
			monsters_health: primary.health,
			roll_attempt: primary.roll_attempt,
			item_quantity: primary.item_quantity,
			item_rarity: primary.item_rarity,
			modded_monster_name: primary.monster_name,
			life_regen: primary.life_regen,
			damage_reduction: primary.damage_reduction,
			monster_speed: primary.monster_speed,
		});
	} catch (error) {
		console.error('Error in createDelveInstance:', error);
		return res.status(500).json({ message: error.message });
	}

	const playerStats = computePlayerCombatStats(
		res.locals.user_data[0],
		res.locals.playerBonuses || {}
	);
	const primary = res.locals.encounterEnemies[0];
	const data = {
		user_id: res.locals.userId,
		monsters_id: primary.monster_id,
		monsters_name: primary.monster_name,
		monsters_description: primary.monster_description,
		level: primary.level,
		health: res.locals.encounterEnemies.reduce((sum, enemy) => sum + enemy.health, 0),
		life_regen: primary.life_regen,
		damage_reduction: primary.damage_reduction,
		roll_attempt: primary.roll_attempt,
		item_quantity: res.locals.encounterEnemies.reduce((sum, enemy) => sum + enemy.item_quantity, 0),
		item_rarity: res.locals.encounterEnemies.reduce((sum, enemy) => sum + enemy.item_rarity, 0),
		player_health: playerStats.player_health,
		player_max_health: playerStats.player_max_health,
		player_damage_reduction: playerStats.player_damage_reduction,
		player_life_regen: playerStats.player_life_regen,
		damage_reduction_penetration: playerStats.damage_reduction_penetration,
		player_speed: playerStats.player_speed,
		monster_speed: primary.monster_speed,
		attacks_remaining: playerStats.player_speed,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error createDelveInstance:', error);
			res.status(500).json(error);
		} else {
			res.locals.insertId = results.insertId;
			next();
		}
	};
	model.setDelveInstance(data, callback);
};

module.exports.insertDelveModifiers = insertEncounterEnemies;

// Display the newly created delve instance
module.exports.displayNewDelve = (req, res, next) => {
	loadFormattedDelve(res.locals.insertId, (error, formatted) => {
		if (error) {
			console.error('Error displaying delve:', error);
			return res.status(500).json({ message: 'Failed to display delve', error });
		}
		if (!formatted) {
			return res.status(404).json({ message: 'Delve instance not found' });
		}

		setFormattedDelveLocals(res, formatted);
		res.locals.createdInstance = buildDelveApiPayload(formatted, getPlayerLevel(res));
		next();
	});
};

function updateEnemiesFromCombat(delveId, enemies, callback) {
	if (!enemies?.length) return callback(null);

	let index = 0;

	const updateNext = (updateError) => {
		if (updateError) return callback(updateError);
		if (index >= enemies.length) return callback(null);

		const enemy = enemies[index];
		index += 1;

		const enemyId = enemy.id ?? enemy.enemy_id;
		if (!Number.isFinite(Number(enemyId))) {
			return updateNext(null);
		}

		enemyModel.updateDelveEnemy(
			{
				id: enemyId,
				delve_instance_id: delveId,
				health: enemy.health,
				status: enemy.status,
			},
			updateNext
		);
	};

	updateNext(null);
}

// Update delve instance using latest roll and turn-based combat
module.exports.updateDelveInstanceByUserId = (req, res, next) => {
	const instance = res.locals.formattedDelve;
	const targetEnemyId = req.body?.targetEnemyId ?? req.body?.target_enemy_id ?? null;

	const playerRoll = {
		rollResult: res.locals.rollResult,
		rollValue: res.locals.rollValue,
		level_result_Modifier: res.locals.level_result_Modifier,
		isCrit: res.locals.isCrit,
		critPerRoll: res.locals.critPerRoll,
		duplicationCount: res.locals.duplicationCount,
		baseRolls: res.locals.baseRolls,
		multiplier: res.locals.multiplier,
	};

	let combatResult;
	try {
		combatResult = resolveCombatAction(instance, playerRoll, targetEnemyId);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}

	res.locals.combatResult = combatResult;

	updateEnemiesFromCombat(req.params.delveId, combatResult.enemies, (enemyError) => {
		if (enemyError) {
			console.error('Error updating delve enemies:', enemyError);
			return res.status(500).json(enemyError);
		}

		const data = {
			id: req.params.delveId,
			health: combatResult.health,
			monster_id: combatResult.monster_id,
			monster_name: combatResult.monster_name,
			level: combatResult.level,
			life_regen: combatResult.life_regen,
			damage_reduction: combatResult.damage_reduction,
			monster_speed: combatResult.monster_speed,
			item_quantity: combatResult.enemies.reduce((sum, enemy) => sum + Number(enemy.item_quantity || 0), 0),
			item_rarity: combatResult.enemies.reduce((sum, enemy) => sum + Number(enemy.item_rarity || 0), 0),
			roll_attempt: combatResult.roll_attempt,
			player_health: combatResult.playerHealth,
			active_turn: combatResult.activeTurn,
			attacks_remaining: combatResult.attacksRemaining,
			status: combatResult.status,
		};

		enemyModel.updateDelveInstanceCombat(data, (error, results) => {
			if (error) {
				console.error('Error updateDelveInstanceByUserId:', error);
				res.status(500).json(error);
			} else if (results.affectedRows == 0) {
				res.status(404).json({ message: 'Delve Instance not found' });
			} else {
				next();
			}
		});
	});
};

// Display current delve instance with evaluated roll outcome
module.exports.displayCurrentDelveInstance = (req, res, next) => {
	loadFormattedDelve(req.params.delveId, (error, formattedDelve) => {
		if (error) {
			console.error('Error fetching Delve instance:', error);
			return res.status(500).json({ message: 'Internal server error', error });
		}
		if (!formattedDelve) {
			return res.status(404).json({ message: 'Delve Instance not found' });
		}

		const playerRoll = {
			rollResult: res.locals.rollResult,
			rollValue: res.locals.rollValue,
			level_result_Modifier: res.locals.level_result_Modifier,
			isCrit: res.locals.isCrit,
			critPerRoll: res.locals.critPerRoll,
			duplicationCount: res.locals.duplicationCount,
			baseRolls: res.locals.baseRolls,
			multiplier: res.locals.multiplier,
		};

		if ([playerRoll.rollResult, playerRoll.rollValue, playerRoll.level_result_Modifier].some((v) => v === undefined)) {
			res.locals.currentInstance = { message: 'Missing necessary data for delve evaluation' };
			return next();
		}

		setFormattedDelveLocals(res, formattedDelve);

		res.locals.currentInstance = evaluateDelveResult({
			updated_delve_stats: [formattedDelve],
			playerRoll,
			monsterTurn: res.locals.combatResult?.monsterTurn || null,
			combatSummary: res.locals.combatResult || null,
		});

		const playerLevel = getPlayerLevel(res);
		if (res.locals.currentInstance?.stats) {
			res.locals.currentInstance.stats.player_level = playerLevel;
		}

		if (res.locals.droppedLoot?.length) {
			res.locals.currentInstance.rewards = {
				type: 'loot_drop',
				items: res.locals.droppedLoot,
			};
		}

		if (res.locals.xpReward) {
			const previousLevel = playerLevel - (res.locals.levelsGained || 0);
			res.locals.currentInstance.xp = {
				gained: res.locals.xpReward,
				levelsGained: res.locals.levelsGained || 0,
				level: playerLevel,
				previousLevel,
				progress: res.locals.xpProgress || null,
			};
		}

		next();
	});
};

// Read all monster modifiers and stash in locals
module.exports.readAllMonsterModifiers = (req, res, next) => {
	const callback = (error, results) => {
		if (error) {
			console.error('Error readAllMonsterModifiers:', error);
			res.status(500).json(error);
		} else {
			res.locals.modifier_data = results;
			next();
		}
	};
	model.selectAllMonsterModifiers(callback);
};

// ensure delve is modifiable
module.exports.checkDelveModifiability = (req, res, next) => {
	const data = { delveId: req.params.delveId };

	const callback = (error, results) => {
		if (error) {
			console.error('Error fetching delve status:', error);
			return res.status(500).json({ message: 'Error fetching delve status', error });
		}
		if (!results || results.length === 0) {
			return res.status(404).json({ message: 'Delve instance not found' });
		}
		if (results[0].status === 'completed') {
			return res.status(400).json({ message: 'This delve is no longer modifiable' });
		}
		next();
	};

	model.getDelveStatus(data, callback);
};
