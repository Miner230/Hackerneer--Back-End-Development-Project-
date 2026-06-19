const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const diceCraftController = require('../controllers/diceCraftController');
const diceSocketController = require('../controllers/diceSocketController');
const userController = require('../controllers/userController');
const lootController = require('../controllers/lootController');
const { verifyToken } = require('../controllers/jwtController');
const responseController = require('../controllers/responseController');

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
	userController.readUserCraftContext,
	diceCraftController.craftEssenceOntoDice,
	diceCraftController.finalizeCraft,
	responseController.sendData
);

router.put(
	'/dice/socket',
	verifyToken,
	userController.readUserCraftContext,
	diceSocketController.socketItemOntoDice,
	diceSocketController.finalizeSocket,
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

router.put(
	'/:lootId/',
	verifyToken,
	userController.readUserById,
	inventoryController.useItemInInventory,
	lootController.handleMechanics,
	lootController.removeQnt,
	inventoryController.getInventoryById,
	responseController.sendData
);

module.exports = router;
