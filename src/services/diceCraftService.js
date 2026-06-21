const diceModel = require('../models/diceModel.js');
const userDiceModel = require('../models/userDiceModel.js');
const diceModifierModel = require('../models/diceModifierModel.js');
const diceSocketModel = require('../models/diceSocketModel.js');
const userModel = require('../models/userModel.js');
const lootModel = require('../models/lootModel.js');
const {
	computeEffectiveDiceStats,
	computePlayerBonusesFromModifiers,
	formatModifierRow,
	isEssenceAffixModifier,
} = require('../utils/diceEssenceCraft.js');
const {
	buildDiceItemSnapshot,
	snapshotTotalsForDiceTable,
} = require('../utils/diceItemSnapshot.js');
const { getDiceRarityForModifierCount, resolveDiceLootId } = require('../utils/diceDropModifiers.js');
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

function syncDiceRarityFromModifiers(userId, dieRow, modifiers, callback) {
	if (!dieRow?.id) return callback(null, dieRow);

	const modifierCount = (modifiers || []).filter(isEssenceAffixModifier).length;
	const targetRarity = getDiceRarityForModifierCount(modifierCount);
	const familyName = dieRow.name;

	const finish = (lootId) => {
		const nextLootId = lootId || dieRow.loot_id;
		const rarityUnchanged =
			targetRarity === dieRow.instance_rarity && nextLootId === dieRow.loot_id;

		if (rarityUnchanged) {
			return callback(null, dieRow);
		}

		userDiceModel.updateInstanceTier(
			{
				userId,
				diceInstanceId: dieRow.id,
				instanceRarity: targetRarity,
				lootId: nextLootId,
			},
			(updateError) => {
				if (updateError) return callback(updateError);

				userDiceModel.selectById({ userId, diceInstanceId: dieRow.id }, (selectError, rows) => {
					if (selectError) return callback(selectError);
					callback(null, rows[0] || { ...dieRow, instance_rarity: targetRarity, loot_id: nextLootId });
				});
			}
		);
	};

	lootModel.selectDiceLootRowsByFamily({ familyName }, (lootError, familyRows) => {
			if (lootError) return callback(lootError);

			const lootId = resolveDiceLootId(familyRows || [], familyName, targetRarity);
			finish(lootId);
		});
}

function rebuildAndPersistDiceSnapshot(userId, diceInstanceId, callback) {
	userDiceModel.selectById({ userId, diceInstanceId }, (diceError, diceRows) => {
		if (diceError) return callback(diceError);

		const dieRow = diceRows[0];
		if (!dieRow?.loot_id) return callback(null, null);

		loadModifiersAndSockets(userId, diceInstanceId, (loadError, { modifiers, sockets }) => {
			if (loadError) return callback(loadError);

			syncDiceRarityFromModifiers(userId, dieRow, modifiers, (syncError, updatedDieRow) => {
				if (syncError) return callback(syncError);

				const snapshot = buildDiceItemSnapshot(updatedDieRow, modifiers, sockets);
				userDiceModel.updateStatsSnapshot(
					{ userId, diceInstanceId, snapshot },
					(updateError) => {
						if (updateError) return callback(updateError);
						callback(null, snapshot);
					}
				);
			});
		});
	});
}

function syncDiceInstanceStatsFromData(userId, dieRow, modifiers, callbackOrSockets, maybeCallback) {
	let knownSockets = null;
	let callback = callbackOrSockets;

	if (typeof callbackOrSockets !== 'function') {
		knownSockets = callbackOrSockets;
		callback = maybeCallback;
	}

	if (!dieRow?.loot_id) {
		return diceModel.resetToDefault({ userId }, (error) => callback(error, knownSockets || []));
	}

	const applyStats = (socketError, sockets) => {
		if (socketError) return callback(socketError);

		const effectiveStats = computeEffectiveDiceStats(dieRow, modifiers, sockets);
		diceModel.applyGearStats({ ...effectiveStats, userId }, (applyError) => {
			callback(applyError, sockets);
		});
	};

	if (knownSockets) {
		return applyStats(null, knownSockets);
	}

	loadSockets(userId, dieRow.id, applyStats);
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

function persistDiceSnapshotAndSync(userId, diceInstanceId, userData, callback) {
	rebuildAndPersistDiceSnapshot(userId, diceInstanceId, (snapshotError, snapshot) => {
		if (snapshotError) return callback(snapshotError);

		resolveEquippedDiceId(userId, userData, (equippedError, equippedDiceId) => {
			if (equippedError) return callback(equippedError);
			if (Number(equippedDiceId) !== Number(diceInstanceId)) return callback(null, snapshot);

			const totals = snapshotTotalsForDiceTable(snapshot);
			if (!totals) return callback(null, snapshot);
			diceModel.applyGearStats({ ...totals, userId }, (syncError) => callback(syncError, snapshot));
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

function applyDropModifiers(userId, diceInstanceId, modifiers, callback) {
	if (!modifiers?.length) {
		return rebuildAndPersistDiceSnapshot(userId, diceInstanceId, callback);
	}

	let index = 0;

	const insertNext = (error) => {
		if (error) return callback(error);
		if (index >= modifiers.length) {
			return rebuildAndPersistDiceSnapshot(userId, diceInstanceId, callback);
		}

		const modifier = modifiers[index];
		index += 1;

			diceModifierModel.insertModifier(
			{
				userId,
				diceInstanceId,
				affixType: modifier.affixType,
				slotIndex: modifier.slotIndex,
				essenceMechanic: modifier.essenceMechanic,
				essenceFamily: modifier.essenceFamily,
				modifierName: modifier.modifierName,
				rolledValue: modifier.rolledValue,
				sourceLootId: modifier.sourceLootId,
				sourceRarity: modifier.sourceRarity,
				sourceKind: 'intrinsic',
			},
			insertNext
		);
	};

	insertNext();
}

module.exports = {
	loadEquippedDiceInstanceId,
	loadModifiers,
	loadSockets,
	loadModifiersAndSockets,
	rebuildAndPersistDiceSnapshot,
	applyDropModifiers,
	persistDiceSnapshotAndSync,
	syncDiceInstanceStatsFromData,
	syncDiceInstanceStats,
	syncEquippedDiceStats,
	syncDiceStatsIfEquipped,
	getEquippedCraftingContext,
};
