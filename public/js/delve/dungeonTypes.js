const DUNGEON_ROOM = {
	ENTRANCE: 'entrance',
	HALL: 'hall',
	CHAMBER: 'chamber',
	VAULT: 'vault',
	STAIRS: 'stairs',
};

const DUNGEON_ROOM_DEFS = {
	[DUNGEON_ROOM.ENTRANCE]: { footprint: [1, 1], isFightRoom: false, label: 'Entrance', icon: '⌂' },
	[DUNGEON_ROOM.HALL]: { footprint: [1, 1], isFightRoom: true, label: 'Hall', icon: '·' },
	[DUNGEON_ROOM.CHAMBER]: { footprint: [2, 2], isFightRoom: true, label: 'Chamber', icon: '▣' },
	[DUNGEON_ROOM.VAULT]: { footprint: [3, 2], isFightRoom: true, label: 'Vault', icon: '◆' },
	[DUNGEON_ROOM.STAIRS]: { footprint: [1, 1], isFightRoom: false, label: 'Down', icon: '▼' },
};

const DUNGEON_GRID_W = 12;
const DUNGEON_GRID_H = 8;

function dungeonFootprint(type) {
	return DUNGEON_ROOM_DEFS[type]?.footprint ?? [1, 1];
}

function isFightRoomType(type) {
	return Boolean(DUNGEON_ROOM_DEFS[type]?.isFightRoom);
}

window.DungeonTypes = {
	ROOM: DUNGEON_ROOM,
	ROOM_DEFS: DUNGEON_ROOM_DEFS,
	GRID_W: DUNGEON_GRID_W,
	GRID_H: DUNGEON_GRID_H,
	footprintForRoom: dungeonFootprint,
	isFightRoomType,
};
