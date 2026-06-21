const ROOM = {
	ENTRANCE: 'entrance',
	HALL: 'hall',
	CHAMBER: 'chamber',
	VAULT: 'vault',
	STAIRS: 'stairs',
};

const ROOM_DEFS = {
	[ROOM.ENTRANCE]: { footprint: [1, 1], isFightRoom: false, label: 'Entrance' },
	[ROOM.HALL]: { footprint: [1, 1], isFightRoom: true, label: 'Hall' },
	[ROOM.CHAMBER]: { footprint: [2, 2], isFightRoom: true, label: 'Chamber' },
	[ROOM.VAULT]: { footprint: [3, 2], isFightRoom: true, label: 'Vault' },
	[ROOM.STAIRS]: { footprint: [1, 1], isFightRoom: false, label: 'Stairs' },
};

const GRID_W = 12;
const GRID_H = 8;

/** @deprecated Use rollEncounterCount(depth, roomType) — kept for map labels only. */
function enemyCountForRoom(type) {
	const bias = { [ROOM.HALL]: 1, [ROOM.CHAMBER]: 2, [ROOM.VAULT]: 3 };
	return bias[type] ?? 1;
}

function footprintForRoom(type) {
	return ROOM_DEFS[type]?.footprint ?? [1, 1];
}

function isFightRoomType(type) {
	return Boolean(ROOM_DEFS[type]?.isFightRoom);
}

module.exports = {
	ROOM,
	ROOM_DEFS,
	GRID_W,
	GRID_H,
	enemyCountForRoom,
	footprintForRoom,
	isFightRoomType,
};
