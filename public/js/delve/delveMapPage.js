(function () {
	const { renderDungeonMap } = window.DungeonMapView;
	const {
		fetchDungeonRun,
		resetDungeonRun,
		enterDungeonRoom,
		enterDungeonCombat,
		returnToDungeonMap,
	} = window.DungeonRunApi;
	const { ROOM } = window.DungeonTypes;

	let currentPayload = null;

	function updateDepthHud(run) {
		const depthEl = document.getElementById('dungeonDepth');
		if (depthEl && run) depthEl.textContent = `Depth ${run.depth}`;
	}

	function showMapMessage(text, isError = false) {
		const el = document.getElementById('dungeonMapMessage');
		if (!el) return;
		el.textContent = text || '';
		el.classList.toggle('dungeon-map-message--error', isError);
	}

	function renderFromPayload(payload) {
		currentPayload = payload;
		const data = payload?.dungeonRunPayload || payload;
		if (!data?.floor || !data?.run) return;

		updateDepthHud(data.run);
		renderDungeonMap(document.getElementById('dungeonMap'), data.floor, {
			onRoomClick: handleRoomClick,
		});
	}

	function loadMap() {
		showMapMessage('Generating floor…');
		fetchDungeonRun((status, data) => {
			if (status !== 200) {
				showMapMessage('Could not load dungeon.', true);
				return;
			}
			showMapMessage('');
			renderFromPayload(data);
		});
	}

	function handleRoomClick(room) {
		showMapMessage('');

		enterDungeonRoom(room.index, (status, data) => {
			if (status !== 200) {
				const msg = data?.message || 'Cannot enter that room.';
				showMapMessage(msg, true);
				return;
			}

			const payload = data.dungeonRunPayload;
			if (!payload) return;

			if (payload.action === 'fight' && payload.encounter) {
				enterDungeonCombat(payload.encounter);
				return;
			}

			if (payload.action === 'descend') {
				renderFromPayload(data);
				showMapMessage(`Descended to depth ${payload.run.depth}.`);
				return;
			}

			renderFromPayload(data);
		});
	}

	function initDelveMapPage() {
		const exitBtn = document.getElementById('exitDungeonMapBtn');
		const resetBtn = document.getElementById('resetDungeonRunBtn');

		if (exitBtn) {
			exitBtn.addEventListener('click', () => {
				GameFullscreen.navigateTo('world.html');
			});
		}

		if (resetBtn) {
			resetBtn.addEventListener('click', () => {
				if (!confirm('Start a new dungeon run? Progress on this floor will be lost.')) return;
				resetDungeonRun((status, data) => {
					if (status === 200) {
						renderFromPayload(data);
						showMapMessage('New run started.');
					}
				});
			});
		}

		bindPageFullscreen({
			bodyClass: 'delve-map-fullscreen',
			arenaId: 'delveMapArena',
		});

		GameFullscreen.enter('delve-map-fullscreen', 'delveMapArena');
		loadMap();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initDelveMapPage);
	} else {
		initDelveMapPage();
	}
})();
