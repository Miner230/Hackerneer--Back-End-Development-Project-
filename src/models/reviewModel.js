const pool = require('../services/db');

// Get all reviews for a specific report
module.exports.selectReviewsByReportId = (data, callback) => {
	const SQLSTATMENT = `
        SELECT 
        review.id,
        review.user_id,
        user.username,
        review.report_id,
        review.rating,
        review.response
    FROM review
    JOIN user ON review.user_id = user.id
    WHERE review.report_id = ?;
    `;
	const VALUES = [data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Get a specific review by id
module.exports.selectReviewById = (data, callback) => {
	const SQLSTATMENT = `
        SELECT * FROM review
        WHERE id = ?;
    `;
	const VALUES = [data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Add a new review for specific report
module.exports.createReview = (data, callback) => {
	const SQLSTATMENT = `
        INSERT INTO review (user_id, report_id, rating, response)
        VALUES (?, ?, ?, ?);
    `;
	const VALUES = [data.userId, data.reportId, data.rating, data.response];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Update the rating and response for a review
module.exports.updateReview = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE review 
        SET rating = ?, response = ?
        WHERE id = ?;
    `;
	const VALUES = [data.rating, data.response, data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Delete review
module.exports.deleteReview = (data, callback) => {
	const SQLSTATMENT = `
        DELETE FROM review 
        WHERE id = ?;
    `;
	const VALUES = [data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Gets info on review based on the user and report
module.exports.selectReviewByUserAndReport = (data, callback) => {
	const SQLSTATEMENT = `
        SELECT * FROM Review
        WHERE user_id = ? AND report_id = ?
        LIMIT 1;
    `;
	const VALUES = [data.userId, data.reportId];
	pool.query(SQLSTATEMENT, VALUES, callback);
};
