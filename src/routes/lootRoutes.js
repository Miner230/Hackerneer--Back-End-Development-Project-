const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const lootController = require('../controllers/lootController');
const { verifyToken } = require('../controllers/jwtController');
const responseController = require('../controllers/responseController');

// Route to claim loot for a specific user
// First, it reads the user data, fetches all loot, removes a loot shard and reputation, and then adds the loot to the user's inventory
router.get(
	'/claim/:amount/users',
	verifyToken,
	userController.readUserById, // Read the user data
	lootController.getAllLoot, // Fetch all available loot
	userController.removeLootShard, // Remove one loot shard from the user's inventory
	userController.removeReputation, // Deduct the required reputation from the user
	lootController.addLootToInventory, // Add the claimed loot to the user's inventory
	responseController.sendData
);

// Export the router to be used in the main application
module.exports = router;
