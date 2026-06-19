const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const diceCraftController = require('../controllers/diceCraftController');
const diceSocketController = require('../controllers/diceSocketController');
const userController = require('../controllers/userController');
const lootController = require('../controllers/lootController');
const { verifyToken } = require('../controllers/jwtController');
const responseController = require('../controllers/responseController');

// Route to get the inventory for a specific user by userId
router.get(
	'/',
	verifyToken,
	userController.readUserById,
	userController.attachAccountFlags,
	inventoryController.getInventoryById,
	responseController.sendData
);

router.post(
	'/admin/grant-crafting-kit',
	verifyToken,
	userController.readUserById,
	userController.requireAdminAccount,
	inventoryController.grantAdminCraftingKit,
	inventoryController.getInventoryById,
	userController.attachAccountFlags,
	responseController.sendData
);

router.put(
	'/dice/craft',
	verifyToken,
	userController.readUserById,
	diceCraftController.craftEssenceOntoDice,
	userController.removeReputation,
	diceCraftController.finalizeCraft,
	inventoryController.getInventoryById,
	responseController.sendData
);

router.put(
	'/dice/socket',
	verifyToken,
	userController.readUserById,
	diceSocketController.socketItemOntoDice,
	userController.removeReputation,
	diceSocketController.finalizeSocket,
	inventoryController.getInventoryById,
	responseController.sendData
);

router.put(
	'/dice/unequip',
	verifyToken,
	userController.readUserById,
	inventoryController.unequipDice,
	inventoryController.getInventoryById,
	responseController.sendData
);

router.put(
	'/dice/:diceInstanceId/equip',
	verifyToken,
	userController.readUserById,
	inventoryController.equipDiceFromInventory,
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
	inventoryController.getInventoryById,
	responseController.sendData
);

// Export the router to be used in the main application
module.exports = router;
