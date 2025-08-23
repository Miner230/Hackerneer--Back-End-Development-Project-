// Send response using stored locals and optional status code
module.exports.sendData = (req, res, next) => {
	if (res.locals.code) {
		res.status(res.locals.code).json(res.locals);
	} else {
		res.status(200).json(res.locals);
	}
};
//res.locals.code should be defined by the function where needed
//eg delete defines res.locals.code as 204