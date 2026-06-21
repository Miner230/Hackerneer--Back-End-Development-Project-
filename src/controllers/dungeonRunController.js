const dungeonRunModel = require('../models/dungeonRunModel.js');
const { packRunState, unpackRunState, createDefaultRunState, toApiShape } = require('../utils/dungeonRunCodec.js');
const { hydrateFloor, canEnterRoom } = require('../utils/dungeonGenerator.js');
const { ROOM } = require('../utils/dungeonTypes.js');

function buildRunResponse(runState) {
	const floor = hydrateFloor(runState);
	return {
		run: toApiShape(runState),
		floor,
	};
}

function loadRunState(userId, callback) {
	dungeonRunModel.selectByUserId(userId, (error, rows) => {
		if (error) return callback(error);

		try {
			if (!rows?.length) {
				const fresh = createDefaultRunState();
				const blob = packRunState(fresh);
				return dungeonRunModel.upsert(userId, blob, (insertError) => {
					if (insertError) return callback(insertError);
					callback(null, fresh);
				});
			}

			callback(null, unpackRunState(rows[0].run_blob));
		} catch (parseError) {
			callback(parseError);
		}
	});
}

function saveRunState(userId, runState, callback) {
	try {
		const blob = packRunState(runState);
		if (blob.length > 96) {
			return callback(new Error('Dungeon run state exceeds storage limit'));
		}
		dungeonRunModel.upsert(userId, blob, callback);
	} catch (error) {
		callback(error);
	}
}

module.exports.getDungeonRun = (req, res, next) => {
	loadRunState(res.locals.userId, (error, runState) => {
		if (error) {
			console.error('getDungeonRun:', error);
			return res.status(500).json({ message: 'Failed to load dungeon run' });
		}
		res.locals.dungeonRunPayload = buildRunResponse(runState);
		next();
	});
};

module.exports.putDungeonRun = (req, res, next) => {
	const incoming = req.body?.run;
	if (!incoming) {
		return res.status(400).json({ message: 'Missing run payload' });
	}

	let runState;
	try {
		runState = {
			s: Number(incoming.seed ?? incoming.s),
			d: Number(incoming.depth ?? incoming.d),
			r: Number(incoming.roomIndex ?? incoming.r),
			c: Array.isArray(incoming.cleared ?? incoming.c) ? incoming.cleared : [],
		};
		packRunState(runState);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}

	saveRunState(res.locals.userId, runState, (error) => {
		if (error) {
			console.error('putDungeonRun:', error);
			return res.status(500).json({ message: 'Failed to save dungeon run' });
		}
		res.locals.dungeonRunPayload = buildRunResponse(runState);
		next();
	});
};

module.exports.resetDungeonRun = (req, res, next) => {
	const seed = Number(req.body?.seed) || Date.now() % 2147483647;
	const fresh = createDefaultRunState(seed);

	saveRunState(res.locals.userId, fresh, (error) => {
		if (error) {
			console.error('resetDungeonRun:', error);
			return res.status(500).json({ message: 'Failed to reset dungeon run' });
		}
		res.locals.dungeonRunPayload = buildRunResponse(fresh);
		next();
	});
};

module.exports.prepareRoomAction = (req, res, next) => {
	const roomIndex = Number(req.body?.roomIndex);
	if (!Number.isFinite(roomIndex)) {
		return res.status(400).json({ message: 'roomIndex required' });
	}

	loadRunState(res.locals.userId, (error, runState) => {
		if (error) {
			console.error('prepareRoomAction load:', error);
			return res.status(500).json({ message: 'Failed to load dungeon run' });
		}

		const floor = hydrateFloor(runState);
		const room = floor.rooms[roomIndex];
		if (!room) {
			return res.status(400).json({ message: 'Invalid room' });
		}

		if (!canEnterRoom(floor, roomIndex)) {
			return res.status(400).json({ message: 'Room is not reachable' });
		}

		let nextState = { ...runState, r: roomIndex };
		let action = 'noop';

		if (room.type === ROOM.STAIRS) {
			nextState = {
				s: runState.s,
				d: runState.d + 1,
				r: 0,
				c: [0],
			};
			action = 'descend';
		} else if (room.type === ROOM.ENTRANCE) {
			action = 'noop';
		} else if (room.cleared) {
			action = 'noop';
		} else {
			action = 'fight';
		}

		saveRunState(res.locals.userId, nextState, (saveError) => {
			if (saveError) {
				console.error('prepareRoomAction save:', saveError);
				return res.status(500).json({ message: 'Failed to save dungeon run' });
			}

			res.locals.dungeonRunPayload = {
				action,
				encounter: action === 'fight' ? { roomIndex, depth: runState.d, enemyCount: room.enemyCount ?? 1, roomType: room.type } : null,
				run: toApiShape(nextState),
				floor: hydrateFloor(nextState),
			};
			next();
		});
	});
};

module.exports.completeRoom = (req, res, next) => {
	const roomIndex = Number(req.body?.roomIndex);
	if (!Number.isFinite(roomIndex)) {
		return res.status(400).json({ message: 'roomIndex required' });
	}

	loadRunState(res.locals.userId, (error, runState) => {
		if (error) {
			console.error('completeRoom load:', error);
			return res.status(500).json({ message: 'Failed to load dungeon run' });
		}

		const cleared = new Set(runState.c);
		cleared.add(roomIndex);
		if (!cleared.has(0)) cleared.add(0);

		const nextState = {
			...runState,
			r: roomIndex,
			c: [...cleared].sort((a, b) => a - b),
		};

		saveRunState(res.locals.userId, nextState, (saveError) => {
			if (saveError) {
				console.error('completeRoom save:', saveError);
				return res.status(500).json({ message: 'Failed to save dungeon run' });
			}
			res.locals.dungeonRunPayload = buildRunResponse(nextState);
			next();
		});
	});
};
