require('dotenv').config();
const bcrypt = require('bcrypt');

const saltRounds = 10;

// Compare plain+pepper password with stored hash
module.exports.comparePassword = (req, res, next) => {
	const pepperedPassword = req.body.password + process.env.JWT_PEPPER;

	const callback = (err, isMatch) => {
		if (err) {
			console.error('Error bcrypt compare:', err);
			return res.status(500).json({ error: 'Internal server error' });
		}
		if (!isMatch) {
			return res.status(401).json({ message: 'Wrong password' });
		}
		next();
	};

	bcrypt.compare(pepperedPassword, res.locals.hash, callback);
};

// Hash plain+pepper password
module.exports.hashPassword = (req, res, next) => {
	const pepperedPassword = req.body.password + process.env.JWT_PEPPER;

	const callback = (err, hash) => {
		if (err) {
			console.error('Error bcrypt hash:', err);
			return res.status(500).json({ error: 'Internal server error' });
		}
		res.locals.hash = hash;
		next();
	};

	bcrypt.hash(pepperedPassword, saltRounds, callback);
};
