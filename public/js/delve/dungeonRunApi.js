const DUNGEON_PENDING_KEY = 'dungeonPendingRoom';

function authToken() {
	if (typeof getToken === 'function') return getToken();
	return localStorage.getItem('token');
}

function fetchDungeonRun(callback) {
	fetchMethod(`${currentUrl}/api/delve/dungeonRun`, callback, 'GET', null, authToken());
}

function resetDungeonRun(callback) {
	fetchMethod(`${currentUrl}/api/delve/dungeonRun/reset`, callback, 'POST', {}, authToken());
}

function enterDungeonRoom(roomIndex, callback) {
	fetchMethod(`${currentUrl}/api/delve/dungeonRun/enterRoom`, callback, 'POST', { roomIndex }, authToken());
}

function completeDungeonRoom(roomIndex, callback) {
	fetchMethod(`${currentUrl}/api/delve/dungeonRun/completeRoom`, callback, 'POST', { roomIndex }, authToken());
}

function setPendingDungeonRoom(payload) {
	if (!payload) {
		sessionStorage.removeItem(DUNGEON_PENDING_KEY);
		sessionStorage.removeItem('delveEncounterCount');
		return;
	}
	sessionStorage.setItem(DUNGEON_PENDING_KEY, JSON.stringify(payload));
	if (payload.enemyCount != null) {
		sessionStorage.setItem('delveEncounterCount', String(payload.enemyCount));
	}
}

function getPendingDungeonRoom() {
	const raw = sessionStorage.getItem(DUNGEON_PENDING_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function hasPendingDungeonRoom() {
	return Boolean(getPendingDungeonRoom());
}

function returnToDungeonMap() {
	window.location.href = 'delveMap.html';
}

function enterDungeonCombat(encounter) {
	setPendingDungeonRoom(encounter);
	sessionStorage.removeItem('delveID');
	window.location.href = 'delve.html';
}

async function finishDungeonRoomVictory(callback) {
	const pending = getPendingDungeonRoom();
	if (!pending || pending.roomIndex == null) {
		setPendingDungeonRoom(null);
		returnToDungeonMap();
		return;
	}

	completeDungeonRoom(pending.roomIndex, (status) => {
		setPendingDungeonRoom(null);
		if (typeof callback === 'function') callback(status);
		returnToDungeonMap();
	});
}

window.DungeonRunApi = {
	fetchDungeonRun,
	resetDungeonRun,
	enterDungeonRoom,
	completeDungeonRoom,
	setPendingDungeonRoom,
	getPendingDungeonRoom,
	hasPendingDungeonRoom,
	returnToDungeonMap,
	enterDungeonCombat,
	finishDungeonRoomVictory,
	DUNGEON_PENDING_KEY,
};
