const pool = require('../services/db');

// Get all reports
module.exports.selectAllReport = (callback) => {
	const SQLSTATMENT = `
        SELECT
            Report.id,
            Report.user_id,
            `user`.username,
            Report.vulnerability_id,
            Vulnerability.type AS vulnType,
            Report.status,
            Report.details,
            Report.solution
        FROM Report
        JOIN `user` ON Report.user_id = `user`.id
        JOIN Vulnerability ON Report.vulnerability_id = Vulnerability.id;
    `;
	pool.query(SQLSTATMENT, callback);
};

// Create a new report
module.exports.createReport = (data, callback) => {
	const SQLSTATMENT = `
        INSERT INTO report (user_id, vulnerability_id, details, solution)
        VALUES (?, ?, ?, ?);
    `;
	const VALUES = [data.userId, data.vulId, data.details, data.solution];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Get a specific report by ID
module.exports.selectReportById = (data, callback) => {
	const SQLSTATMENT = `
        SELECT
            Report.id,
            Report.user_id,
            Report.closer_id,
            reporter.username AS reporter_username,
            closer.username AS closer_username,
            Report.vulnerability_id,
            Vulnerability.type AS vulnType,
            Report.status,
            Report.details,
            Report.solution
        FROM Report
        JOIN `user` AS reporter ON Report.user_id = reporter.id
        LEFT JOIN `user` AS closer ON Report.closer_id = closer.id
        JOIN Vulnerability ON Report.vulnerability_id = Vulnerability.id
        WHERE Report.id = ?;
    `;
	const VALUES = [data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Change the status of a report (e.g., to "verified")
module.exports.changeStatus = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE report
        SET status = ?, closer_id = ?, solution = ?
        WHERE id = ?;
    `;
	const VALUES = [data.status, data.userId, data.solution, data.id];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Display report details with reporter's reputation
module.exports.displayReportInfo = (data, callback) => {
	const SQLSTATMENT = `
        SELECT 
            report.id,
            report.status,
            report.user_id,
            report.vulnerability_id,
            `user`.reputation AS user_reputation
        FROM report
        JOIN `user` ON report.user_id = `user`.id
        WHERE report.id = ?;
    `;
	const VALUES = [data.reportId];
	pool.query(SQLSTATMENT, VALUES, callback);
};

// Display updated report with closer ID and reporter's reputation
module.exports.displayUpdatedReportInfo = (data, callback) => {
	const SQLSTATMENT = `
        SELECT
            Report.id,
            Report.user_id,
            Report.closer_id,
            reporter.username AS reporter_username,
            closer.username AS closer_username,
            Report.vulnerability_id,
            Vulnerability.type AS vulnType,
            Report.status,
            Report.details,
            Report.solution
        FROM Report
        JOIN `user` AS reporter ON Report.user_id = reporter.id
        LEFT JOIN `user` AS closer ON Report.closer_id = closer.id
        JOIN Vulnerability ON Report.vulnerability_id = Vulnerability.id
        WHERE Report.id = ?;
    `;
	const VALUES = [data.reportId];
	pool.query(SQLSTATMENT, VALUES, callback);
};
