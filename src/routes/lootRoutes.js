const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const lootController = require('../controllers/lootController');
const { verifyToken } = require('../controllers/jwtController');
const responseController = require('../controllers/responseController');

router.get(
	'/claim/:amount/users',
	verifyToken,
	userController.readUserById,
	lootController.getAllLoot,
	userController.removeLootShard,
	lootController.addLootToInventory,
	responseController.sendData
);

module.exports = router;
