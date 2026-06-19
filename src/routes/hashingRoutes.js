const express = require('express');

// Controller imports
const userController = require('../controllers/userController');
const jwtController = require('../controllers/jwtController');
const bcryptController = require('../controllers/bcryptController');
const diceController = require('../controllers/diceController');
const router = express.Router();

// User login: validate credentials, compare password, issue JWT
router.post(
	'/login',
	userController.login,
	bcryptController.comparePassword,
	jwtController.generateToken,
	jwtController.sendToken
);

// User registration: check username, hash password, create account, assign dice, issue JWT
router.post(
	'/register',
	userController.checkUsernameExists,
	bcryptController.hashPassword,
	userController.register,
	diceController.createNewDice,
	diceController.grantStarterDice,
	jwtController.generateToken,
	jwtController.sendToken
);

module.exports = router;
