const WORLD_FULLSCREEN_CLASS = 'world-fullscreen';
const WORLD_ARENA_ID = 'worldArena';

document.addEventListener('DOMContentLoaded', () => {
	const exitBtn = document.getElementById('exitWorldBtn');
	if (exitBtn) exitBtn.addEventListener('click', exitWorld);

	document.addEventListener('fullscreenchange', syncWorldFullscreenState);
	document.addEventListener('webkitfullscreenchange', syncWorldFullscreenState);

	enterWorldFullscreen();
});

function enterWorldFullscreen() {
	GameFullscreen.enter(WORLD_FULLSCREEN_CLASS, WORLD_ARENA_ID);
}

function exitWorldFullscreen() {
	GameFullscreen.exit(WORLD_FULLSCREEN_CLASS);
}

function syncWorldFullscreenState() {
	const arenaVisible = Boolean(document.getElementById(WORLD_ARENA_ID));
	GameFullscreen.sync(WORLD_FULLSCREEN_CLASS, arenaVisible);
}

function exitWorld() {
	exitWorldFullscreen();
	window.location.href = 'profile.html';
}
