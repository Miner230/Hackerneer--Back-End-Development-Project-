const RESPONSE_EXCLUDE_KEYS = new Set([
	'code',
	'userId',
	'tokenTimestamp',
	'insertId',
	'instance_Data',
	'combatResult',
	'targetDiceInstanceId',
	'craftAction',
	'craftedModifier',
	'socketedItem',
	'craftDieRow',
	'updatedModifiers',
	'updatedSockets',
	'consumableLootId',
	'itemName',
	'mechanic',
	'statline',
	'craft_cost',
	'repCost',
	'hash',
	'reportId',
	'vulId',
	'reportData',
	'reviewData',
	'vulnData',
	'newUser',
	'account_role',
]);

function sanitizeValue(key, value) {
	if (key === 'user_data' && Array.isArray(value)) {
		return value.map((user) => {
			if (!user || typeof user !== 'object') return user;
			const { password, hash, ...safeUser } = user;
			return safeUser;
		});
	}
	return value;
}

function buildResponsePayload(locals) {
	const payload = {};

	Object.entries(locals || {}).forEach(([key, value]) => {
		if (RESPONSE_EXCLUDE_KEYS.has(key)) return;
		payload[key] = sanitizeValue(key, value);
	});

	return payload;
}

module.exports.buildResponsePayload = buildResponsePayload;

module.exports.sendData = (req, res, next) => {
	const payload = buildResponsePayload(res.locals);
	const status = res.locals.code || 200;
	res.status(status).json(payload);
};
