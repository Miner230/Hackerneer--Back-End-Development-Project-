require('dotenv').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT config
const secretKey = process.env.JWT_SECRET_KEY;
const tokenDuration = process.env.JWT_EXPIRES_IN;
const tokenAlgorithm = process.env.JWT_ALGORITHM;
const pepper = process.env.JWT_PEPPER;

// Generate JWT (login/register flows)
module.exports.generateToken = (req, res, next) => {
	// Use DB user.id on /login; otherwise use userId set earlier in the chain
	const userId =
		req.method === 'POST' && req.route.path === '/login'
			? res.locals.user.id
			: res.locals.userId;

	// Bind a pepper-derived hash to the token to detect tampering
	const pepperHash = crypto.createHash('sha256').update(userId + pepper).digest('hex');

	const payload = {
		userId,
		timestamp: new Date(), // issuer timestamp
		pepperHash,            // integrity check (recomputed during verify)
	};

	const options = {
		algorithm: tokenAlgorithm,
		expiresIn: tokenDuration,
	};

	jwt.sign(payload, secretKey, options, (err, token) => {
	 if (err) {
			console.log('Error generating JWT:', err);
			return res.status(500).json({ error: 'Token generation failed' });
		}
		res.locals.token = token;
		next();
	});
};

// Send JWT to client
module.exports.sendToken = (req, res, next) => {
	res.status(200).json({
		message: res.locals.message,
		token: res.locals.token,
	});
};

// Verify JWT (auth gate)
module.exports.verifyToken = (req, res, next) => {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'No token provided' });
	}

	const token = authHeader.substring(7);

	jwt.verify(token, secretKey, (err, decoded) => {
		if (err) {
			console.log('Invalid JWT:', err);
			return res.status(401).json({ error: 'Invalid token' });
		}

		// Recompute pepper hash and compare
		const expectedPepperHash = crypto
			.createHash('sha256')
			.update(decoded.userId + pepper)
			.digest('hex');

		if (decoded.pepperHash !== expectedPepperHash) {
			return res.status(401).json({ error: 'Token integrity compromised (pepper mismatch)' });
		}

		res.locals.userId = decoded.userId;
		res.locals.tokenTimestamp = decoded.timestamp;
		next();
	});
};
