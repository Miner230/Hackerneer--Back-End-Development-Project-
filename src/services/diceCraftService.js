const diceModel = require('../models/diceModel.js');
const userDiceModel = require('../models/userDiceModel.js');
const diceModifierModel = require('../models/diceModifierModel.js');
const diceSocketModel = require('../models/diceSocketModel.js');
const userModel = require('../models/userModel.js');
const {
	computeEffectiveDiceStats,
	computePlayerBonusesFromModifiers,
	formatModifierRow,
	isEssenceAffixModifier,
} = require('../utils/diceEssenceCraft.js');
const { formatSocketRow } = require('../utils/diceSockets.js');

function parseOptionalUserData(userDataOrCallback, maybeCallback) {
	if (typeof userDataOrCallback === 'function') {
		return { userData: null, callback: userDataOrCallback };
	}
	return { userData: userDataOrCallback, callback: maybeCallback };
}

function resolveEquippedDiceId(userId, userData, callback) {
	const equippedFromUser = userData?.[0]?.equipped_dice_id;
	if (equippedFromUser !== undefined && equippedFromUser !== null) {
		return callback(null, equippedFromUser);
	}
	if (userData?.[0] && userData[0].equipped_dice_id === null) {
		return callback(null, null);
	}

	userModel.selectUserById({ id: userId }, (error, rows) => {
		if (error) return callback(error);
		callback(null, rows[0]?.equipped_dice_id || null);
	});
}

function loadEquippedDiceInstanceId(userId, callback) {
	resolveEquippedDiceId(userId, null, callback);
}

function loadModifiers(userId, diceInstanceId, callback) {
	if (!diceInstanceId) return callback(null, []);

	diceModifierModel.selectByDiceInstanceId({ userId, diceInstanceId }, (error, rows) => {
		if (error) return callback(error);
		callback(
			null,
			rows.map(formatModifierRow).filter(isEssenceAffixModifier)
		);
	});
}

function loadSockets(userId, diceInstanceId, callback) {
	if (!diceInstanceId) return callback(null, []);

	diceSocketModel.selectByDiceInstanceId({ userId, diceInstanceId }, (error, rows) => {
		if (error) return callback(error);
		callback(null, rows.map(formatSocketRow));
	});
}

function loadModifiersAndSockets(userId, diceInstanceId, callback) {
	if (!diceInstanceId) {
		return callback(null, { modifiers: [], sockets: [] });
	}

	let modifierError = null;
	let socketError = null;
	let modifiers = [];
	let sockets = [];
	let pending = 2;

	const done = () => {
		pending -= 1;
		if (pending > 0) return;
		if (modifierError) return callback(modifierError);
		if (socketError) return callback(socketError);
		callback(null, { modifiers, sockets });
	};

	loadModifiers(userId, diceInstanceId, (error, rows) => {
		if (error) modifierError = error;
		else modifiers = rows;
		done();
	});

	loadSockets(userId, diceInstanceId, (error, rows) => {
		if (error) socketError = error;
		else sockets = rows;
		done();
	});
}

function syncDiceInstanceStats(userId, diceInstanceId, callback) {
	userDiceModel.selectById({ userId, diceInstanceId }, (diceError, diceRows) => {
		if (diceError) return callback(diceError);

		const dieRow = diceRows[0];
		if (!dieRow?.loot_id) {
			return diceModel.resetToDefault({ userId }, callback);
		}

		loadModifiersAndSockets(userId, diceInstanceId, (loadError, { modifiers, sockets }) => {
			if (loadError) return callback(loadError);

			const effectiveStats = computeEffectiveDiceStats(dieRow, modifiers, sockets);
			diceModel.applyGearStats({ ...effectiveStats, userId }, callback);
		});
	});
}

function syncEquippedDiceStats(userId, userDataOrCallback, maybeCallback) {
	const { userData, callback } = parseOptionalUserData(userDataOrCallback, maybeCallback);

	resolveEquippedDiceId(userId, userData, (equippedError, equippedDiceId) => {
		if (equippedError) return callback(equippedError);
		if (!equippedDiceId) {
			return diceModel.resetToDefault({ userId }, callback);
		}
		syncDiceInstanceStats(userId, equippedDiceId, callback);
	});
}

function getEquippedCraftingContext(userId, userDataOrCallback, maybeCallback) {
	const { userData, callback } = parseOptionalUserData(userDataOrCallback, maybeCallback);

	resolveEquippedDiceId(userId, userData, (equippedError, equippedDiceId) => {
		if (equippedError) return callback(equippedError);

		if (!equippedDiceId) {
			return callback(null, {
				equippedDiceId: null,
				modifiers: [],
				sockets: [],
				playerBonuses: computePlayerBonusesFromModifiers([]),
			});
		}

		loadModifiersAndSockets(userId, equippedDiceId, (loadError, { modifiers, sockets }) => {
			if (loadError) return callback(loadError);

			callback(null, {
				equippedDiceId,
				modifiers,
				sockets,
				playerBonuses: computePlayerBonusesFromModifiers(modifiers),
			});
		});
	});
}

function syncDiceStatsIfEquipped(userId, diceInstanceId, userDataOrCallback, maybeCallback) {
	const { userData, callback } = parseOptionalUserData(userDataOrCallback, maybeCallback);

	resolveEquippedDiceId(userId, userData, (equippedError, equippedDiceId) => {
		if (equippedError) return callback(equippedError);
		if (equippedDiceId !== diceInstanceId) return callback(null);
		syncDiceInstanceStats(userId, diceInstanceId, callback);
	});
}

module.exports = {
	loadEquippedDiceInstanceId,
	loadModifiers,
	loadSockets,
	loadModifiersAndSockets,
	syncDiceInstanceStats,
	syncEquippedDiceStats,
	syncDiceStatsIfEquipped,
	getEquippedCraftingContext,
};
