(function () {
	function requestElementFullscreen(target) {
		const el = target || document.documentElement;
		const request =
			el.requestFullscreen?.() ||
			el.webkitRequestFullscreen?.() ||
			el.msRequestFullscreen?.();

		if (request?.catch) {
			request.catch(() => {});
		}
	}

	function exitDocumentFullscreen() {
		if (!document.fullscreenElement && !document.webkitFullscreenElement) return;

		const exit =
			document.exitFullscreen?.() ||
			document.webkitExitFullscreen?.() ||
			document.msExitFullscreen?.();

		if (exit?.catch) exit.catch(() => {});
	}

	window.GameFullscreen = {
		enter(bodyFullscreenClass, targetId) {
			if (bodyFullscreenClass) {
				document.body.classList.add(bodyFullscreenClass);
			}

			const target = (targetId && document.getElementById(targetId)) || document.documentElement;
			requestElementFullscreen(target);

			if (window.MobileLandscape?.lock) {
				window.MobileLandscape.lock();
			}
		},

		exit(bodyFullscreenClass) {
			if (bodyFullscreenClass) {
				document.body.classList.remove(bodyFullscreenClass);
			}

			exitDocumentFullscreen();

			if (window.MobileLandscape?.unlock) {
				window.MobileLandscape.unlock();
			}
		},

		sync(bodyFullscreenClass, contentVisible) {
			const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);

			if (!bodyFullscreenClass || !contentVisible) return;

			if (isFullscreen) {
				document.body.classList.add(bodyFullscreenClass);
				return;
			}

			document.body.classList.add(bodyFullscreenClass);
		},
	};
})();
