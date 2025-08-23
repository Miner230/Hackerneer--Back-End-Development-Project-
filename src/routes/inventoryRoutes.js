const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const userController = require('../controllers/userController');
const lootController = require('../controllers/lootController');
const { verifyToken } = require('../controllers/jwtController');
const responseController = require('../controllers/responseController');

// Route to get the inventory for a specific user by userId
router.get(
	'/',
	verifyToken,
	userController.readUserById,
	inventoryController.getInventoryById,
	responseController.sendData
);

// Route to use an item from the inventory for a specific user
router.put(
	'/:lootId/',
	verifyToken,
	userController.readUserById,
	inventoryController.useItemInInventory, 
	lootController.handleMechanics, 
	userController.removeReputation, 
	lootController.removeQnt, 
	responseController.sendData
);

// Export the router to be used in the main application
module.exports = router;
