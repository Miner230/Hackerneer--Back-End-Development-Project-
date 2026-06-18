const model = require('../models/delveModel.js');
const {
	evaluateDelveResult,
	processMonsterData,
	formatDelveResults,
	computePlayerCombatStats,
	resolveCombatAction,
} = require('../middleware/delveConfigs.js');

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
	const data = { id: req.params.delveId, user_id: res.locals.userId };

	const callback = (error, results) => {
		if (error) {
			console.error('Error readDelveInstanceById:', error);
			res.status(500).json(error);
		} else if (results.length === 0) {
			res.status(404).json({ message: 'Delve Instance not found or not owned by you' });
		} else {
			const formatted = formatDelveResults(results);
			formatted.health = Math.max(0, formatted.health);

			res.locals.instance_Data = results;
			res.locals.createdInstance = {
				id: formatted.delve_id,
				user_id: formatted.user_id,
				monster: {
					id: formatted.monster_id,
					name: formatted.monster_name,
					description: formatted.monster_description,
				},
				modifiers:
					formatted.modifiers.length > 0 ? formatted.modifiers : 'This monster has no modifiers.',
				level: formatted.level,
				health: formatted.health,
				life_regen: formatted.life_regen,
				damage_reduction: formatted.damage_reduction,
				roll_attempt: formatted.roll_attempt,
				loot_shard_count: formatted.loot_shard_count,
				player_health: formatted.player_health,
				player_max_health: formatted.player_max_health,
				player_damage_reduction: formatted.player_damage_reduction,
				player_speed: formatted.player_speed,
				monster_speed: formatted.monster_speed,
				active_turn: formatted.active_turn,
				attacks_remaining: formatted.attacks_remaining,
				status: formatted.status,
			};
			next();
		}
	};
	model.selectDelveInstanceById(data, callback);
};

// Create a new delve instance (selects monster/modifiers, scales stats)
module.exports.createDelveInstance = (req, res, next) => {
	try {
		const result = processMonsterData(
			res.locals.monster_data,
			res.locals.modifier_data,
			res.locals.user_data
		);

		Object.assign(res.locals, {
			selectedMonsters: result.selectedMonsters,
			selectedModifiers: result.selectedModifiers,
			selectedModifierIds: result.selectedModifierIds,
			monsters_level: result.monsters_level,
			monsters_health: result.monsters_health,
			roll_attempt: result.roll_attempt,
			loot_shard_count: result.loot_shard_count,
			modded_monster_name: result.modded_monster_name,
			life_regen: result.life_regen,
			damage_reduction: result.damage_reduction,
			monster_speed: result.monster_speed,
		});
	} catch (error) {
		console.error('Error in createDelveInstance:', error);
		return res.status(500).json({ message: error.message });
	}

	const monsters_data = res.locals.selectedMonsters;
	const playerStats = computePlayerCombatStats(res.locals.user_data[0]);
	const data = {
		user_id: res.locals.userId,
		monsters_id: monsters_data.id,
		monsters_name: res.locals.modded_monster_name,
		monsters_description: monsters_data.description,
		level: res.locals.monsters_level,
		health: res.locals.monsters_health,
		life_regen: res.locals.life_regen,
		damage_reduction: res.locals.damage_reduction,
		roll_attempt: res.locals.roll_attempt,
		loot_shard_count: res.locals.loot_shard_count,
		player_health: playerStats.player_health,
		player_max_health: playerStats.player_max_health,
		player_damage_reduction: playerStats.player_damage_reduction,
		player_speed: playerStats.player_speed,
		monster_speed: res.locals.monster_speed,
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

// Display the newly created delve instance
module.exports.displayNewDelve = (req, res, next) => {
	const data = {
		id: res.locals.insertId,
		monsterId: res.locals.selectedMonsters.id,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error displaying delve:', error);
			return res.status(500).json({ message: 'Failed to display delve', error });
		}
		if (results.length === 0) {
			return res.status(404).json({ message: 'Delve instance not found' });
		}

		const first = results[0];
		const modifiers = results
			.filter((r) => r.modifier_id !== null)
			.map((r) => ({ id: r.modifier_id, name: r.modifier_name, description: r.modifier_description }));

		res.locals.createdInstance = {
			id: first.delve_id,
			user_id: first.user_id,
			monster: { id: first.monster_id, name: first.monster_name, description: first.monster_description },
			modifiers: modifiers.length === 0 ? 'This monster has no modifiers.' : modifiers,
			level: first.level,
			health: first.health,
			life_regen: first.life_regen,
			damage_reduction: first.damage_reduction,
			roll_attempt: first.roll_attempt,
			loot_shard_count: first.loot_shard_count,
			player_health: first.player_health,
			player_max_health: first.player_max_health,
			player_damage_reduction: first.player_damage_reduction,
			player_speed: first.player_speed,
			monster_speed: first.monster_speed,
			active_turn: first.active_turn,
			attacks_remaining: first.attacks_remaining,
			status: first.status,
		};
		next();
	};
	model.displayDelve(data, callback);
};

// Insert selected modifiers into join table
module.exports.insertDelveModifiers = (req, res, next) => {
	const data = {
		delveId: res.locals.insertId,
		modifierIds: res.locals.selectedModifierIds,
	};

	const callback = (error) => {
		if (error) {
			console.error('Error insertDelveModifiers:', error);
			return res.status(500).json({ message: 'Failed to insert modifiers', error });
		}
		next();
	};
	model.insertDelveModifiers(data, callback);
};

// Update delve instance using latest roll and turn-based combat
module.exports.updateDelveInstanceByUserId = (req, res, next) => {
	const instance = formatDelveResults(res.locals.instance_Data);

	const playerRoll = {
		rollResult: res.locals.rollResult,
		rollValue: res.locals.rollValue,
		level_result_Modifier: res.locals.level_result_Modifier,
		isCrit: res.locals.isCrit,
		duplicationCount: res.locals.duplicationCount,
		baseRolls: res.locals.baseRolls,
		multiplier: res.locals.multiplier,
	};

	let combatResult;
	try {
		combatResult = resolveCombatAction(instance, playerRoll);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}

	res.locals.combatResult = combatResult;

	const data = {
		id: req.params.delveId,
		health: combatResult.health,
		player_health: combatResult.playerHealth,
		active_turn: combatResult.activeTurn,
		attacks_remaining: combatResult.attacksRemaining,
		status: combatResult.status,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error updateDelveInstanceByUserId:', error);
			res.status(500).json(error);
		} else if (results.affectedRows == 0) {
			res.status(404).json({ message: 'Delve Instance not found' });
		} else {
			next();
		}
	};
	model.updateDelveInstance(data, callback);
};

// Display current delve instance with evaluated roll outcome
module.exports.displayCurrentDelveInstance = (req, res, next) => {
	const data = { id: req.params.delveId };

	const callback = (error, results) => {
		if (error) {
			console.error('Error fetching Delve instance:', error);
			return res.status(500).json({ message: 'Internal server error', error });
		}
		if (!results || results.length === 0) {
			return res.status(404).json({ message: 'Delve Instance not found' });
		}

		const formattedDelve = formatDelveResults(results);
		const playerRoll = {
			rollResult: res.locals.rollResult,
			rollValue: res.locals.rollValue,
			level_result_Modifier: res.locals.level_result_Modifier,
			isCrit: res.locals.isCrit,
			duplicationCount: res.locals.duplicationCount,
			baseRolls: res.locals.baseRolls,
			multiplier: res.locals.multiplier,
		};

		if ([playerRoll.rollResult, playerRoll.rollValue, playerRoll.level_result_Modifier].some((v) => v === undefined)) {
			res.locals.currentInstance = { message: 'Missing necessary data for delve evaluation' };
			return next();
		}

		res.locals.currentInstance = evaluateDelveResult({
			updated_delve_stats: [formattedDelve],
			playerRoll,
			monsterTurn: res.locals.combatResult?.monsterTurn || null,
			combatSummary: res.locals.combatResult || null,
		});
		next();
	};

	model.displayDelve(data, callback);
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
