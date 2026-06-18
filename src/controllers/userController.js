const model = require('../models/userModel.js');

// Get all users
module.exports.getAllUsers = (req, res, next) => {
	const callback = (error, results) => {
		if (error) {
			console.error('Error getAllUsers:', error);
			res.status(500).json(error);
		} else {
			res.status(200).json(results);
		}
	};
	model.selectAll(callback);
};

// Create a new user
module.exports.createNewUser = (req, res, next) => {
	const data = {
		username: req.body.username,
		password: req.body.password,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error createNewUser:', error);
			res.status(500).json(error);
		} else {
			res.locals.insertId = results.insertId; // Pass inserted ID to next middleware
			next();
		}
	};
	model.addUser(data, callback);
};

// Display newly created user
module.exports.displayNewUser = (req, res, next) => {
	const data = res.locals.insertId;

	const callback = (error, results) => {
		res.locals.newUser = { user: results[0] };
	};
	model.displayAddedUser(data, callback);
};

// Check if username already exists
module.exports.checkUsernameExists = (req, res, next) => {
	if (!req.body || Object.keys(req.body).length === 0) {
		return res.status(400).json({ message: 'Error: request body is empty' });
	}

	const data = { username: req.body.username };

	const callback = (error, results) => {
		if (error) {
			console.error('Error checkUsername:', error);
			res.status(500).json(error);
		} else if (results[0].count > 0) {
			res.status(409).json({ message: 'Username already in use.' });
		} else {
			next();
		}
	};
	model.checkUsername(data, callback);
};

// Read user by ID
module.exports.readUserById = (req, res, next) => {
	const data = {
		id: req.params.userId || res.locals.userId || req.body.user_id,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error readUserById:', error);
			res.status(500).json(error);
		} else if (results.length === 0) {
			res.status(404).json({ message: 'User not found' });
		} else {
			res.locals.user_data = results;
			next();
		}
	};
	model.selectUserByIdSecure(data, callback);
};

// Update user by ID
module.exports.updateUserById = (req, res, next) => {
	if (req.body.username === undefined || req.body.reputation === undefined) {
		return res.status(400).json({ message: 'Error: username or reputation is undefined' });
	}

	const data = {
		id: req.params.userId,
		username: req.body.username,
		reputation: req.body.reputation,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error updateUserById:', error);
			res.status(500).json(error);
		} else if (results.affectedRows === 0) {
			res.status(404).json({ message: 'Failed to update user' });
		} else {
			res.status(200).json(data);
		}
	};
	model.updateUserById(data, callback);
};

// Update user reputation after a vulnerability report
module.exports.updateUserRep = (req, res, next) => {
	data = {
		userId: res.locals.userId,
		vulId: req.body.vulnerability_id || res.locals.vulId,
		multi: res.locals.user_data[0].rep_multi,
	};

	const callback = (error) => {
		if (error) {
			console.error('Error updateUserRep:', error);
			res.status(500).json(error);
		} else {
			next();
		}
	};
	model.updateUserRep(data, callback);
};

// Update user stats after a completed delve
module.exports.updateUserByDelve = (req, res, next) => {
	if (res.locals.instance_Data[0].health > 0) {
		return next(); // Only update stats if monster is defeated
	}

	data = {
		userId: res.locals.userId,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error updateUserByDelve:', error);
			res.status(500).json(error);
		} else if (results.affectedRows === 0) {
			res.status(404).json({ message: 'Failed to update from delve' });
		} else {
			next();
		}
	};
	model.incrementUserStats(data, callback);
};

// Remove loot shard(s) from user
module.exports.removeLootShard = (req, res, next) => {
	const amount = parseInt(req.params.amount) || 1;
	const user = res.locals.user_data[0];

	if (user.loot_shard < amount) {
		return res.status(409).json({ message: 'Not enough loot shards' });
	}
	if (user.reputation < 150 * amount) {
		return res.status(409).json({ message: `Not enough reputation to claim ${amount} loot shard(s)` });
	}

	const data = { userId: res.locals.userId, amount };

	const callback = (error, results) => {
		if (error) {
			console.error('Error RemoveLootShard:', error);
			return res.status(500).json(error);
		}
		if (results.affectedRows === 0) {
			return res.status(404).json({ message: 'Failed to update loot shard count' });
		}
		next();
	};
	model.decrementLootShard(data, callback);
};

// Remove reputation when claiming loot
module.exports.removeReputation = (req, res, next) => {
	const amount = parseInt(req.params.amount) || 1;
	const costPerLoot = 150;
	const totalCost = costPerLoot * amount;

	res.locals.craft_cost = totalCost;

	const data = { userId: res.locals.userId, usedRep: totalCost };

	const callback = (error, results) => {
		if (error) {
			console.error('Error removeReputation:', error);
			return res.status(500).json(error);
		}
		if (results.affectedRows === 0) {
			return res.status(404).json({ message: 'Not enough reputation to claim loot' });
		}
		next();
	};
	model.removeRep(data, callback);
};

// Get leaderboard data
module.exports.getLeaderboard = (req, res, next) => {
	const callback = (error, results) => {
		if (error) {
			console.error('Error getLeaderboard:', error);
			res.status(500).json(error);
		} else {
			res.status(200).json(results);
		}
	};
	model.selectLeaderboard(callback);
};

// Register a new user
module.exports.register = (req, res, next) => {
	if (req.body.username === undefined || req.body.password === undefined) {
		return res.status(400).json({ message: 'Error: Username or password is undefined' });
	}

	const data = {
		username: req.body.username,
		password: res.locals.hash,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error register:', error);
			res.status(500).json(error);
		} else {
			res.locals.userId = results.insertId;
			res.locals.message = `User ${req.body.username} created successfully.`;
			next();
		}
	};
	model.addUser(data, callback);
};

// Login user
module.exports.login = (req, res, next) => {
	if (req.body.username === undefined || req.body.password === undefined) {
		return res.status(400).json({ message: 'Error: Username or password is undefined' });
	}

	const data = { username: req.body.username };

	const callback = (error, results) => {
		if (error) {
			console.error('Error login:', error);
			res.status(500).json(error);
		} else if (results.length === 0) {
			res.status(404).json({ message: 'User not found' });
		} else {
			res.locals.user = results[0];
			res.locals.hash = results[0].password;
			next();
		}
	};
	model.selectByUsername(data, callback);
};
