const diceModel = require('../models/diceModel.js');
const diceGearModel = require('../models/diceGearModel.js');
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

function loadEquippedDiceInstanceId(userId, callback) {
	userModel.selectUserById({ id: userId }, (error, rows) => {
		if (error) return callback(error);
		callback(null, rows[0]?.equipped_dice_id || null);
	});
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

function syncEquippedDiceStats(userId, callback) {
	loadEquippedDiceInstanceId(userId, (equippedError, equippedDiceId) => {
		if (equippedError) return callback(equippedError);

		if (!equippedDiceId) {
			return diceModel.resetToDefault({ userId }, callback);
		}

		diceGearModel.selectEquippedForUser({ userId }, (gearError, gearRows) => {
			if (gearError) return callback(gearError);

			const equippedRow = gearRows[0];
			if (!equippedRow?.loot_id) {
				return diceModel.resetToDefault({ userId }, callback);
			}

			loadModifiers(userId, equippedDiceId, (modifierError, modifiers) => {
				if (modifierError) return callback(modifierError);

				loadSockets(userId, equippedDiceId, (socketError, sockets) => {
					if (socketError) return callback(socketError);

					const effectiveStats = computeEffectiveDiceStats(equippedRow, modifiers, sockets);
					diceModel.applyGearStats({ ...effectiveStats, userId }, callback);
				});
			});
		});
	});
}

function getEquippedCraftingContext(userId, callback) {
	loadEquippedDiceInstanceId(userId, (equippedError, equippedDiceId) => {
		if (equippedError) return callback(equippedError);

		if (!equippedDiceId) {
			return callback(null, {
				equippedDiceId: null,
				modifiers: [],
				sockets: [],
				playerBonuses: computePlayerBonusesFromModifiers([]),
			});
		}

		loadModifiers(userId, equippedDiceId, (modifierError, modifiers) => {
			if (modifierError) return callback(modifierError);

			loadSockets(userId, equippedDiceId, (socketError, sockets) => {
				if (socketError) return callback(socketError);

				callback(null, {
					equippedDiceId,
					modifiers,
					sockets,
					playerBonuses: computePlayerBonusesFromModifiers(modifiers),
				});
			});
		});
	});
}

function syncDiceStatsIfEquipped(userId, diceInstanceId, callback) {
	loadEquippedDiceInstanceId(userId, (equippedError, equippedDiceId) => {
		if (equippedError) return callback(equippedError);
		if (equippedDiceId !== diceInstanceId) return callback(null);
		syncEquippedDiceStats(userId, callback);
	});
}

module.exports = {
	loadEquippedDiceInstanceId,
	loadModifiers,
	loadSockets,
	syncEquippedDiceStats,
	syncDiceStatsIfEquipped,
	getEquippedCraftingContext,
};
