(function () {
	const { ROOM, footprintForRoom, GRID_W, GRID_H, isFightRoomType } = window.DungeonTypes;
	const { rollEncounterCountFromRng } = window.DungeonEncounter;

	function mulberry32(seed) {
		let state = seed >>> 0;
		return function next() {
			state = (state + 0x6d2b79f5) >>> 0;
			let t = state;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	function pickRoomType(area, rng) {
		if (area >= 6) return rng() < 0.35 ? ROOM.VAULT : ROOM.CHAMBER;
		if (area >= 4) return ROOM.CHAMBER;
		return ROOM.HALL;
	}

	function split(rect, depth, rng, out) {
		const { x, y, w, h } = rect;
		const area = w * h;

		if (depth <= 0 || area <= 2 || (w < 3 && h < 3)) {
			out.push(rect);
			return;
		}

		const splitHorizontal = w > h ? rng() > 0.5 : rng() <= 0.5;

		if (splitHorizontal && w >= 4) {
			const cut = 2 + Math.floor(rng() * (w - 2));
			split({ x, y, w: cut, h }, depth - 1, rng, out);
			split({ x: x + cut, y, w: w - cut, h }, depth - 1, rng, out);
			return;
		}

		if (!splitHorizontal && h >= 4) {
			const cut = 2 + Math.floor(rng() * (h - 2));
			split({ x, y, w, h: cut }, depth - 1, rng, out);
			split({ x, y: y + cut, w, h: h - cut }, depth - 1, rng, out);
			return;
		}

		out.push(rect);
	}

	function rectsTouch(a, b) {
		const ax2 = a.x + a.w;
		const ay2 = a.y + a.h;
		const bx2 = b.x + b.w;
		const by2 = b.y + b.h;
		const overlapX = a.x < bx2 && ax2 > b.x;
		const overlapY = a.y < by2 && ay2 > b.y;
		const adjacentX = (ax2 === b.x || bx2 === a.x) && overlapY;
		const adjacentY = (ay2 === b.y || by2 === a.y) && overlapX;
		return adjacentX || adjacentY;
	}

	function roomCenter(room) {
		return {
			x: room.x + room.w / 2,
			y: room.y + room.h / 2,
		};
	}

	function centerDistance(a, b) {
		const ac = roomCenter(a);
		const bc = roomCenter(b);
		return Math.abs(ac.x - bc.x) + Math.abs(ac.y - bc.y);
	}

	function buildAdjacency(edges) {
		const adj = new Map();
		const add = (a, b) => {
			if (!adj.has(a)) adj.set(a, new Set());
			if (!adj.has(b)) adj.set(b, new Set());
			adj.get(a).add(b);
			adj.get(b).add(a);
		};
		edges.forEach(([a, b]) => add(a, b));
		return adj;
	}

	function buildRoomConnections(rooms) {
		const edges = [];
		for (let i = 0; i < rooms.length; i++) {
			for (let j = i + 1; j < rooms.length; j++) {
				const a = rooms[i].leaf || rooms[i];
				const b = rooms[j].leaf || rooms[j];
				if (rectsTouch(a, b)) edges.push([i, j]);
			}
		}

		const adj = buildAdjacency(edges);
		const visited = new Set([0]);
		const queue = [0];

		while (queue.length) {
			const node = queue.shift();
			(adj.get(node) || []).forEach((neighbor) => {
				if (visited.has(neighbor)) return;
				visited.add(neighbor);
				queue.push(neighbor);
			});
		}

		for (let i = 0; i < rooms.length; i++) {
			if (visited.has(i)) continue;

			let nearest = 0;
			let nearestDist = Infinity;
			visited.forEach((node) => {
				const dist = centerDistance(rooms[i], rooms[node]);
				if (dist < nearestDist) {
					nearestDist = dist;
					nearest = node;
				}
			});

			edges.push([i, nearest]);
			if (!adj.has(i)) adj.set(i, new Set());
			if (!adj.has(nearest)) adj.set(nearest, new Set());
			adj.get(i).add(nearest);
			adj.get(nearest).add(i);
			visited.add(i);
		}

		return edges;
	}

	function roomsLinked(connections, a, b) {
		return connections.some(([left, right]) => (left === a && right === b) || (left === b && right === a));
	}

	function buildRoomOccupancy(rooms, gridW, gridH) {
		const occupied = new Set();
		rooms.forEach((room) => {
			for (let y = room.y; y < room.y + room.h; y++) {
				for (let x = room.x; x < room.x + room.w; x++) {
					if (x >= 0 && y >= 0 && x < gridW && y < gridH) occupied.add(`${x},${y}`);
				}
			}
		});
		return occupied;
	}

	function buildPathCells(fromRoom, toRoom, occupied) {
		const fx = Math.round(roomCenter(fromRoom).x - 0.5);
		const fy = Math.round(roomCenter(fromRoom).y - 0.5);
		const tx = Math.round(roomCenter(toRoom).x - 0.5);
		const ty = Math.round(roomCenter(toRoom).y - 0.5);
		const cells = [];
		const seen = new Set();
		let x = fx;
		let y = fy;

		const push = (cx, cy) => {
			const key = `${cx},${cy}`;
			if (seen.has(key) || occupied.has(key)) return;
			seen.add(key);
			cells.push({ x: cx, y: cy });
		};

		while (x !== tx) {
			x += x < tx ? 1 : -1;
			push(x, y);
		}
		while (y !== ty) {
			y += y < ty ? 1 : -1;
			push(x, y);
		}

		return cells;
	}

	function generateFloor(seed, depth) {
		const rng = mulberry32((seed + depth * 9973) >>> 0);
		const leaves = [];
		split({ x: 0, y: 0, w: GRID_W, h: GRID_H }, 3, rng, leaves);

		const rooms = leaves.map((leaf, index) => {
			const type = pickRoomType(leaf.w * leaf.h, rng);
			const [fw, fh] = footprintForRoom(type);
			const w = Math.min(fw, leaf.w);
			const h = Math.min(fh, leaf.h);

			return {
				index,
				type,
				x: leaf.x + Math.floor((leaf.w - w) / 2),
				y: leaf.y + Math.floor((leaf.h - h) / 2),
				w,
				h,
				leaf: { x: leaf.x, y: leaf.y, w: leaf.w, h: leaf.h },
			};
		});

		const entranceIdx = 0;
		rooms[entranceIdx] = {
			...rooms[entranceIdx],
			type: ROOM.ENTRANCE,
			w: 1,
			h: 1,
			x: rooms[entranceIdx].leaf.x + Math.floor((rooms[entranceIdx].leaf.w - 1) / 2),
			y: rooms[entranceIdx].leaf.y + Math.floor((rooms[entranceIdx].leaf.h - 1) / 2),
		};

		let stairsIdx = rooms.length - 1;
		let bestDist = -1;
		rooms.forEach((room, index) => {
			if (index === entranceIdx) return;
			const dist = centerDistance(room, rooms[entranceIdx]);
			if (dist > bestDist) {
				bestDist = dist;
				stairsIdx = index;
			}
		});

		const stairLeaf = rooms[stairsIdx].leaf;
		rooms[stairsIdx] = {
			...rooms[stairsIdx],
			type: ROOM.STAIRS,
			w: 1,
			h: 1,
			x: stairLeaf.x + Math.floor((stairLeaf.w - 1) / 2),
			y: stairLeaf.y + Math.floor((stairLeaf.h - 1) / 2),
		};

		const connections = buildRoomConnections(rooms);
		const occupied = buildRoomOccupancy(rooms, GRID_W, GRID_H);

		rooms.forEach((room) => {
			room.enemyCount = isFightRoomType(room.type)
				? rollEncounterCountFromRng(depth, room.type, rng)
				: 0;
		});

		return {
			depth,
			seed,
			grid: { w: GRID_W, h: GRID_H },
			rooms,
			connections,
			occupied,
		};
	}

	function hydrateFloor(run) {
		const floor = generateFloor(run.seed, run.depth);
		const clearedSet = new Set(run.cleared || []);
		const currentIndex = run.roomIndex ?? 0;

		const rooms = floor.rooms.map((room) => ({
			...room,
			cleared: clearedSet.has(room.index) || room.type === ROOM.ENTRANCE,
			visited:
				clearedSet.has(room.index) ||
				room.index === currentIndex ||
				room.type === ROOM.ENTRANCE,
		}));

		return {
			...floor,
			rooms,
			currentRoomIndex: currentIndex,
		};
	}

	function canEnterRoom(floorState, targetIndex) {
		const rooms = floorState.rooms;
		const connections = floorState.connections || [];
		const target = rooms[targetIndex];
		const current = rooms[floorState.currentRoomIndex];
		if (!target || !current) return false;

		if (!roomsLinked(connections, current.index, target.index)) return false;

		if (target.type === ROOM.STAIRS) return true;
		if (target.cleared) return false;
		if (target.index === current.index) return false;

		return true;
	}

	function getNeighborIndices(floorState, roomIndex) {
		const connections = floorState.connections || [];
		const neighbors = new Set();
		connections.forEach(([a, b]) => {
			if (a === roomIndex) neighbors.add(b);
			if (b === roomIndex) neighbors.add(a);
		});
		return [...neighbors];
	}

	window.DungeonGenerator = {
		generateFloor,
		hydrateFloor,
		canEnterRoom,
		rectsTouch,
		buildPathCells,
		getNeighborIndices,
		roomsLinked,
	};
})();
