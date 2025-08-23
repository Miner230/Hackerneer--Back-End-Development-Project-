const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken } = require('../controllers/jwtController');
const responseController = require('../controllers/responseController');

// Get a specific review by review ID
router.get(
	'/:reviewId',
	reviewController.readReviewById,
	responseController.sendData
);

// Get all reviews for a specific report
router.get(
	'/reports/:reportId',
	reviewController.readReviewsByReportId,
	responseController.sendData
);

// Create a new review for a report 
router.post(
	'/reports/:reportId',
	verifyToken,
	reviewController.createReviewForReport,
	responseController.sendData
);

// Update an existing review by review ID 
router.put(
	'/:reviewId',
	verifyToken,
	reviewController.checkUserOwnsReview,
	reviewController.updateReviewById,
	responseController.sendData
);

// Delete a review by review ID 
router.delete(
	'/:reviewId',
	verifyToken,
	reviewController.checkUserOwnsReview,
	reviewController.deleteReviewById
);

// Check if the authenticated user has already reviewed a specific report
router.get(
	'/check/:reportId',
	verifyToken,
	reviewController.checkIfUserReviewedReport,
	responseController.sendData
);

module.exports = router;
