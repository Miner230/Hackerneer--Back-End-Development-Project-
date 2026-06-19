const express = require('express');
const router = express.Router();
const levelingController = require('../controllers/levelingController');
const userController = require('../controllers/userController');
const responseController = require('../controllers/responseController');
const { verifyToken } = require('../controllers/jwtController');

router.put(
	'/',
	verifyToken,
	userController.readUserById,
	levelingController.incrementUserLevel,
	responseController.sendData
);

module.exports = router;
