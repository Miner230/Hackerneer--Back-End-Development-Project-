(function () {
	const { ROOM_DEFS } = window.DungeonTypes;
	const { canEnterRoom, buildPathCells, getNeighborIndices } = window.DungeonGenerator;

	function buildFoeIndicator(room, def) {
		if (!def?.isFightRoom) return '';

		if (room.cleared) {
			return `
				<div class="pixel-room-foes pixel-room-foes--cleared" aria-label="Room cleared">
					<span class="pixel-room-foes-icon" aria-hidden="true">✓</span>
				</div>
			`;
		}

		const count = Math.max(1, Math.min(5, Number(room.enemyCount) || 1));
		const dots = Array.from({ length: count }, () => '<span class="pixel-room-foe-dot"></span>').join('');

		return `
			<div class="pixel-room-foes" title="${count} ${count === 1 ? 'enemy' : 'enemies'}">
				<div class="pixel-room-foe-dots pixel-room-foe-dots--${count}" aria-hidden="true">${dots}</div>
				<span class="pixel-room-foe-count">×${count}</span>
			</div>
		`;
	}

	function foeLabelForRoom(room, def) {
		if (!def?.isFightRoom) return '';
		if (room.cleared) return ', cleared';
		const count = Math.max(1, Number(room.enemyCount) || 1);
		return `, ${count} ${count === 1 ? 'enemy' : 'enemies'}`;
	}

	function renderPathLayer(pathLayer, floorState, options = {}) {
		const { grid, rooms, connections, currentRoomIndex } = floorState;
		const occupied = new Set();
		rooms.forEach((room) => {
			for (let y = room.y; y < room.y + room.h; y++) {
				for (let x = room.x; x < room.x + room.w; x++) {
					occupied.add(`${x},${y}`);
				}
			}
		});

		const pathCells = new Map();
		const currentRoom = rooms[currentRoomIndex];
		const enterableNeighbors = new Set(
			getNeighborIndices(floorState, currentRoomIndex).filter((index) =>
				canEnterRoom(floorState, index)
			)
		);

		connections.forEach(([a, b]) => {
			const from = rooms[a];
			const to = rooms[b];
			if (!from || !to) return;

			const isActive =
				(a === currentRoomIndex && enterableNeighbors.has(b)) ||
				(b === currentRoomIndex && enterableNeighbors.has(a));

			buildPathCells(from, to, occupied).forEach((cell) => {
				const key = `${cell.x},${cell.y}`;
				const existing = pathCells.get(key);
				if (!existing || isActive) {
					pathCells.set(key, { ...cell, active: isActive || existing?.active });
				}
			});
		});

		pathCells.forEach((cell) => {
			const tile = document.createElement('div');
			tile.className = `pixel-path${cell.active ? ' pixel-path--active' : ''}`;
			tile.style.gridColumn = `${cell.x + 1}`;
			tile.style.gridRow = `${cell.y + 1}`;
			pathLayer.appendChild(tile);
		});
	}

	function renderDungeonMap(container, floorState, handlers = {}) {
		if (!container || !floorState) return;

		const { grid, rooms, currentRoomIndex } = floorState;
		container.innerHTML = '';
		container.style.setProperty('--map-cols', grid.w);
		container.style.setProperty('--map-rows', grid.h);

		const pathLayer = document.createElement('div');
		pathLayer.className = 'dungeon-map-paths';
		pathLayer.setAttribute('aria-hidden', 'true');
		pathLayer.style.setProperty('--map-cols', grid.w);
		pathLayer.style.setProperty('--map-rows', grid.h);
		renderPathLayer(pathLayer, floorState);
		container.appendChild(pathLayer);

		const roomLayer = document.createElement('div');
		roomLayer.className = 'dungeon-map-rooms';
		roomLayer.style.setProperty('--map-cols', grid.w);
		roomLayer.style.setProperty('--map-rows', grid.h);

		rooms.forEach((room) => {
			const def = ROOM_DEFS[room.type] || Object.values(ROOM_DEFS)[0];
			const enterable = canEnterRoom(floorState, room.index);
			const isCurrent = room.index === currentRoomIndex;

			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = [
				'pixel-room',
				`pixel-room--${room.type}`,
				room.cleared ? 'pixel-room--cleared' : '',
				isCurrent ? 'pixel-room--current' : '',
				enterable ? 'pixel-room--enterable' : '',
			]
				.filter(Boolean)
				.join(' ');
			btn.style.gridColumn = `${room.x + 1} / span ${room.w}`;
			btn.style.gridRow = `${room.y + 1} / span ${room.h}`;
			btn.dataset.roomIndex = String(room.index);
			btn.setAttribute('aria-disabled', enterable ? 'false' : 'true');
			btn.setAttribute(
				'aria-label',
				`${def.label}${foeLabelForRoom(room, def)}${isCurrent ? ', you are here' : ''}${enterable ? ', click to enter' : ''}`
			);

			const foeLine = buildFoeIndicator(room, def);

			btn.innerHTML = `
				<span class="pixel-room-icon" aria-hidden="true">${def.icon}</span>
				<span class="pixel-room-label">${def.label}</span>
				${foeLine}
			`;

			btn.addEventListener('click', () => {
				if (!enterable) return;
				if (handlers.onRoomClick) handlers.onRoomClick(room);
			});

			roomLayer.appendChild(btn);
		});

		container.appendChild(roomLayer);
	}

	window.DungeonMapView = { renderDungeonMap };
})();
