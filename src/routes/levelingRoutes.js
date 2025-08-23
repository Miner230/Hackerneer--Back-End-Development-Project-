const express = require('express');
const router = express.Router();
const levelingController = require('../controllers/levelingController');
const userController = require('../controllers/userController');
const responseController = require('../controllers/responseController');
const { verifyToken } = require('../controllers/jwtController');
// Route to level up a user
// It reads user data, checks if they have enough reputation for leveling, removes the required reputation, and increments their level
router.put(
	'/',
	verifyToken, 
	userController.readUserById, // First, read the user data
	levelingController.readLevelCost, // Check if the user has enough reputation for the level up cost
	levelingController.removeRep, // Remove the reputation cost required to level up
	levelingController.incrementUserLevel, // Increment the user's level
	responseController.sendData
);

// Export the router to be used in the main application
module.exports = router;
