const model = require('../models/reportModel.js');

// Get all reports
module.exports.getAllReports = (req, res, next) => {
	const callback = (error, results) => {
		if (error) {
			console.error('Error getAllReports:', error);
			res.status(500).json(error);
		} else {
			res.locals.reportList = results;
			next();
		}
	};
	model.selectAllReport(callback);
};

// Create a new report
module.exports.createReport = (req, res, next) => {
	data = {
		userId: res.locals.userId,
		vulId: req.body.vulnerability_id,
		details: req.body.details,
		solution: 'none',
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error createReport:', error);
			res.status(500).json(error);
		} else {
			res.locals.reportId = results.insertId;
			res.locals.code = 201;
			next();
		}
	};
	model.createReport(data, callback);
};

// Read a specific report by ID
module.exports.readReportById = (req, res, next) => {
	const data = { id: req.params.reportId };

	const callback = (error, results) => {
		if (error) {
			console.error('Error readReportById:', error);
			res.status(500).json(error);
		} else if (results[0].count > 0) {
			res.status(409).json(error);
		} else {
			res.locals.vulId = results[0].vulnerability_id;
			res.locals.reportData = results;
			next();
		}
	};
	model.selectReportById(data, callback);
};

// Update report status by ID
module.exports.updateReportStatusById = (req, res, next) => {
	if (req.body.status == undefined || res.locals.userId == undefined) {
		return res.status(400).json({ message: 'Error: status or user_id is undefined' });
	} else if (req.body.status != 0 && req.body.status != 1) {
		return res.status(400).json({ message: 'Error: status must be 1 or 0' });
	}

	const data = {
		id: req.params.reportId,
		userId: res.locals.userId,
		status: req.body.status,
		solution: req.body.solution,
	};

	const callback = (error) => {
		if (error) {
			console.error('Error updateUserById:', error);
			res.status(500).json(error);
		} else {
			next();
		}
	};
	model.changeStatus(data, callback);
};

// Display a specific report (newly created)
module.exports.displayReport = (req, res, next) => {
	data = {
		reportId: res.locals.reportId || req.params.reportId,
		userId: req.body.user_id,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error displayReport:', error);
			res.status(500).json(error);
		} else {
			res.locals.report = { message: 'Successfully created report', results };
			next();
		}
	};
	model.displayReportInfo(data, callback);
};

// Display a specific report (after update)
module.exports.displayUpdatedReport = (req, res, next) => {
	data = {
		reportId: req.params.reportId,
		userId: req.body.user_id,
	};

	const callback = (error, results) => {
		if (error) {
			console.error('Error displayReport:', error);
			res.status(500).json(error);
		} else {
			res.locals.report = { message: 'Successfully closed report', results };
			next();
		}
	};
	model.displayUpdatedReportInfo(data, callback);
};

// Validate required fields for creating or updating reports
module.exports.validateReportFields = (req, res, next) => {
	if (
		(req.body.vulnerability_id === undefined || res.locals.userId === undefined) &&
		req.method === 'POST'
	) {
		return res.status(400).json({ message: 'Error: vulnerability_id or user_id is undefined' });
	} else if (
		(req.body.status === undefined || res.locals.userId === undefined) &&
		req.method === 'PUT' &&
		req.route.path === '/:reportId'
	) {
		return res.status(400).json({ message: 'Error: status or user_id is undefined' });
	}
	next();
};
