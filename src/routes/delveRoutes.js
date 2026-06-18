const express = require('express');
const router = express.Router();
const delveController = require('../controllers/delveController');
const userController = require('../controllers/userController');
const diceController = require('../controllers/diceController');
const jwtController = require('../controllers/jwtController');
const lootController = require('../controllers/lootController');
const responseController = require('../controllers/responseController');

// Route to get monster, modifier and loot data for the logbook page
router.get(
	'/logbookdata',
	delveController.readAllMonsters,
	delveController.readAllMonsterModifiers,
	lootController.getAllLoot,
	responseController.sendData
);

// Route to get the user data and associated monsters, modifiers, and create a new delve instance
router.get(
	'/createInstance',
	jwtController.verifyToken,
	userController.readUserById,
	delveController.readAllMonsters,
	delveController.readAllMonsterModifiers,
	delveController.createDelveInstance,
	delveController.insertDelveModifiers,
	delveController.displayNewDelve,
	responseController.sendData
);

//route to get delve instance data by id
router.get('/:delveId', 
	jwtController.verifyToken,
	delveController.readDelveInstanceById, 
	responseController.sendData
);

// Route to update the delve instance for a user
router.put(
	'/:delveId/action',
	jwtController.verifyToken,
	userController.readUserById,
	diceController.readDiceByUserId,
	delveController.readDelveInstanceById,
	delveController.checkDelveModifiability,
	diceController.rollDice,
	delveController.updateDelveInstanceByUserId,
	delveController.readDelveInstanceById,
	userController.updateUserByDelve,
	lootController.getAllLoot,
	lootController.grantMonsterDrops,
	delveController.displayCurrentDelveInstance,
	responseController.sendData
);

// Export the router to be used in the main application
module.exports = router;
