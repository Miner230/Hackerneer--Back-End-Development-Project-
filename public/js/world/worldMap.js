const WORLD_FULLSCREEN_CLASS = 'world-fullscreen';
const WORLD_ARENA_ID = 'worldArena';

function exitWorld() {
	if (window.GameFullscreen?.clearPersistentMode) {
		GameFullscreen.clearPersistentMode();
	}
	window.location.href = 'profile.html';
}

function initWorldPage() {
	const exitBtn = document.getElementById('exitWorldBtn');
	if (exitBtn) exitBtn.addEventListener('click', exitWorld);

	bindPageFullscreen({
		bodyClass: WORLD_FULLSCREEN_CLASS,
		arenaId: WORLD_ARENA_ID,
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initWorldPage);
} else {
	initWorldPage();
}
