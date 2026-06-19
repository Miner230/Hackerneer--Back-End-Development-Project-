const express = require('express');
const router = express.Router();
const diceController = require('../controllers/diceController');
const diceCraftController = require('../controllers/diceCraftController');
const userController = require('../controllers/userController');
const { verifyToken } = require('../controllers/jwtController');
const responseController = require('../controllers/responseController');

// Route to get profile page data
router.get(
	'/profile',
	verifyToken,
	userController.readUserById,
	diceController.readDiceByUserId,
	diceCraftController.attachDiceCraftingData,
	responseController.sendData
);

// Export the router to be used in the main application
module.exports = router;
