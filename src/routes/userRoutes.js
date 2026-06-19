const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const diceController = require('../controllers/diceController');
const { verifyToken } = require('../controllers/jwtController');
const responseController = require('../controllers/responseController');

// Get leaderboard data
router.get('/leaderboard', userController.getLeaderboard);

// Route to get a specific user by userId
router.get('/userData', 
    verifyToken, 
    userController.readUserById,
    userController.attachXpProgress,
    responseController.sendData
);

// Export the router to be used in the main application
module.exports = router;
