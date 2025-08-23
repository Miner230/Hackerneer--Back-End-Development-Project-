const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const userController = require('../controllers/userController');
const vulController = require('../controllers/vulnerabilityController');
const { verifyToken } = require('../controllers/jwtController');
const responseController = require('../controllers/responseController');

// Route to create a new report
// It reads the user data, checks if the vulnerability exists, creates the report, updates the user's reputation, and displays the new report
router.post(
	'/',
	verifyToken,
	reportController.validateReportFields,
	userController.readUserById, // First, read the user data
	vulController.checkVulnerabilityExists, // Check if the vulnerability exists
	reportController.createReport, // Create the report in the database
	userController.updateUserRep, // Update the user's reputation based on the new report
	reportController.displayReport, // Display the newly created report
	responseController.sendData
);

// Route to update an existing report's status
// It reads the user data, fetches the report, updates the report status, updates the user's reputation, and displays the updated report
router.put(
	'/:reportId',
	verifyToken,
	reportController.validateReportFields,
	userController.readUserById, // Read the user data
	reportController.readReportById, // Read the report data
	reportController.updateReportStatusById, // Update the report status
	userController.updateUserRep, // Update the user's reputation based on the new report status
	reportController.displayUpdatedReport, // Display the updated report
	responseController.sendData
);

// Route to get just the report list
router.get(
	'/', 
	reportController.getAllReports, 
	responseController.sendData
);

// Route to get bounty page data
router.get(
	'/bounty',
	reportController.getAllReports,
	vulController.readAllVulnerability,
	responseController.sendData
);

// Route to get a specific report by its ID
router.get('/:reportId', reportController.readReportById, responseController.sendData); // Calls reportController's readReportById function to fetch the report by ID

// Export the router to be used in the main application
module.exports = router;
