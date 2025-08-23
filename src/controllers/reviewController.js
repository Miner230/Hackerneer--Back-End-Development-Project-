const model = require('../models/reviewModel.js');

// Read all reviews made for a report
module.exports.readReviewsByReportId = (req, res, next) => {
	const data = {
		id: req.params.reportId, // Get report ID from route parameters
	};

	const callback = (error, results, fields) => {
		if (error) {
			console.error('Error readReviewsByReportId:', error);
			res.status(500).json(error); 
		} else {
			res.locals.reviewList = results
			next()
		}
	};

	model.selectReviewsByReportId(data, callback); 
};

// Read review by id
module.exports.readReviewById = (req, res, next) => {
	const data = {
		id: req.params.reviewId, // Get review ID from route parameters
	};

	const callback = (error, results, fields) => {
		if (error) {
			console.error('Error readReviewsByReportId:', error);
			res.status(500).json(error); 
		} else {
			res.locals.reviewData = results
			next()
		}
	};

	model.selectReviewById(data, callback); // Call model function to fetch the report by ID
};

// Create a new report
module.exports.createReviewForReport = (req, res, next) => {
	data = {
		userId: res.locals.userId, 
		reportId: req.params.reportId, 
		rating: req.body.rating,
		response: req.body.response,
	};

	const callback = (error, results, fields) => {
		if (error) {
			console.error('Error createReport:', error);
			res.status(500).json(error); 
		} else {
			res.locals.message = 'Successfully created review';
			res.locals.createdReview = results;
			res.locals.code = 201
			next()
		}
	};

	model.createReview(data, callback); // Call model function to create a new review
};

// Update review
module.exports.updateReviewById = (req, res, next) => {
	data = {
		id: req.params.reviewId, // Get vulnerability ID from request body
		rating: req.body.rating,
		response: req.body.response,
	};

	const callback = (error, results, fields) => {
		if (error) {
			console.error('Error createReport:', error);
			res.status(500).json(error); // Respond with 500 error on failure
		} else {
			res.locals.message = 'Successfully updated review';
			res.locals.updateReview = results;
			next()
		}
	};

	model.updateReview(data, callback); // Call model function to create a new report
};

// Delete report
module.exports.deleteReviewById = (req, res, next) => {
	data = {
		id: req.params.reviewId,
	};

	const callback = (error, results, fields) => {
		if (error) {
			console.error('Error createReport:', error);
			res.status(500).json(error); // Respond with 500 error on failure
		} else {
			res.status(204).send();
		}
	};

	model.deleteReview(data, callback); // Call model function to create a new report
};

// Middleware to check if the authenticated user owns the review
module.exports.checkUserOwnsReview = (req, res, next) => {
	const data = {
		id: req.params.reviewId, // Review ID from URL
	};

	const currentUserId = res.locals.userId;

	const callback = (error, results, fields) => {
		if (error) {
			console.error('Error checking review ownership:', error);
			return res.status(500).json({ error: 'Database error' });
		}

		if (!results || results.length === 0) {
			return res.status(404).json({ error: 'Review not found' });
		}

		const review = results[0];

		if (review.user_id !== currentUserId) {
			return res.status(403).json({ error: 'Forbidden: You do not own this review' });
		}

		// Ownership confirmed
		next();
	};

	model.selectReviewById(data, callback);
};

// Check if the user has already submitted a review for a report
module.exports.checkIfUserReviewedReport = (req, res, next) => {
	const data = {
		reportId: req.params.reportId,
		userId: res.locals.userId,
	};

	const callback = (error, results, fields) => {
		if (error) {
			console.error('Error checkIfUserReviewedReport:', error);
			return res.status(500).json({ error: 'Database error' });
		}

		if (results && results.length > 0) {
			// User has submitted a review
			res.locals.reviewedStatus = true;
			res.locals.review = results[0]
			next()
		} else {
			// No review found
			res.locals.reviewedStatus = false;
			next()
		}
	};

	model.selectReviewByUserAndReport(data, callback); // Call model function
};
