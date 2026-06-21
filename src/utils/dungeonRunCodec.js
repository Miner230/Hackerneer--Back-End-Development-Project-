/**
 * Compact dungeon run persistence (~15–40 bytes typical).
 * Format: "{seed36},{depth},{roomIndex},{cleared}.{cleared}..."
 * - seed: base-36 integer (RNG seed, stable for whole run)
 * - depth: floor depth (increments on staircase descend)
 * - roomIndex: current room index on this floor
 * - cleared: sorted unique room indices cleared on this floor (dot-separated)
 */

const MAX_DEPTH = 9999;
const MAX_ROOM_INDEX = 99;

function packRunState(state) {
	const seed = Number(state.s ?? state.seed);
	const depth = Number(state.d ?? state.depth);
	const room = Number(state.r ?? state.roomIndex);
	const cleared = Array.isArray(state.c ?? state.cleared) ? state.c : [];

	if (!Number.isFinite(seed) || seed < 0) throw new Error('Invalid dungeon seed');
	if (!Number.isFinite(depth) || depth < 1 || depth > MAX_DEPTH) throw new Error('Invalid depth');
	if (!Number.isFinite(room) || room < 0 || room > MAX_ROOM_INDEX) throw new Error('Invalid room index');

	const uniqueCleared = [...new Set(cleared.map(Number).filter((n) => Number.isFinite(n) && n >= 0))].sort(
		(a, b) => a - b
	);
	const clearedPart = uniqueCleared.length ? uniqueCleared.join('.') : '';

	return `${seed.toString(36)},${depth},${room}${clearedPart ? `,${clearedPart}` : ''}`;
}

function unpackRunState(blob) {
	if (!blob || typeof blob !== 'string') {
		return createDefaultRunState();
	}

	const parts = blob.split(',');
	if (parts.length < 3) throw new Error('Corrupt dungeon run blob');

	const seed = parseInt(parts[0], 36);
	const depth = Number(parts[1]);
	const room = Number(parts[2]);
	const cleared =
		parts.length > 3
			? parts
					.slice(3)
					.join(',')
					.split('.')
					.map(Number)
					.filter((n) => Number.isFinite(n) && n >= 0)
			: [];

	if (!Number.isFinite(seed) || !Number.isFinite(depth) || !Number.isFinite(room)) {
		throw new Error('Corrupt dungeon run blob');
	}

	return { s: seed, d: depth, r: room, c: [...new Set(cleared)].sort((a, b) => a - b) };
}

function createDefaultRunState(seed = Date.now() % 2147483647) {
	return { s: seed, d: 1, r: 0, c: [0] };
}

function toApiShape(state) {
	return {
		seed: state.s,
		depth: state.d,
		roomIndex: state.r,
		cleared: state.c,
	};
}

module.exports = {
	packRunState,
	unpackRunState,
	createDefaultRunState,
	toApiShape,
	MAX_DEPTH,
};
