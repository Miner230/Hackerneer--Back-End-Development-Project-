(function () {
	function bindPageFullscreen(options) {
		if (!window.GameFullscreen?.bootScreen) return;
		GameFullscreen.bootScreen(options);
	}

	window.bindPageFullscreen = bindPageFullscreen;
})();
