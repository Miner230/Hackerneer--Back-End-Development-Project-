(function () {
	const PERSIST_KEY = 'hackerneerGameFullscreen';

	let gestureRetryTarget = null;
	let gestureRetryBound = false;

	function getFullscreenElement() {
		return (
			document.fullscreenElement ||
			document.webkitFullscreenElement ||
			document.mozFullScreenElement ||
			document.msFullscreenElement ||
			null
		);
	}

	function isDocumentFullscreen() {
		return Boolean(getFullscreenElement());
	}

	function isPersistentMode() {
		try {
			return sessionStorage.getItem(PERSIST_KEY) === '1';
		} catch {
			return false;
		}
	}

	function markPersistentMode() {
		try {
			sessionStorage.setItem(PERSIST_KEY, '1');
		} catch {
			/* ignore */
		}
	}

	function clearPersistentMode() {
		try {
			sessionStorage.removeItem(PERSIST_KEY);
		} catch {
			/* ignore */
		}
		clearGestureRetry();
	}

	function nativeFullscreenTarget() {
		return document.documentElement;
	}

	function requestElementFullscreen(target) {
		const el = target || nativeFullscreenTarget();
		const request =
			el.requestFullscreen ||
			el.webkitRequestFullscreen ||
			el.mozRequestFullScreen ||
			el.msRequestFullscreen;

		if (!request) {
			return Promise.resolve(false);
		}

		return Promise.resolve(request.call(el))
			.then(() => isDocumentFullscreen())
			.catch(() => false);
	}

	function exitDocumentFullscreen() {
		if (!isDocumentFullscreen()) {
			return Promise.resolve();
		}

		const exit =
			document.exitFullscreen ||
			document.webkitExitFullscreen ||
			document.mozCancelFullScreen ||
			document.msExitFullscreen;

		if (!exit) {
			return Promise.resolve();
		}

		return Promise.resolve(exit.call(document)).catch(() => {});
	}

	function toggleElementFullscreen(target) {
		if (isDocumentFullscreen()) {
			return exitDocumentFullscreen();
		}

		return requestElementFullscreen(target || nativeFullscreenTarget());
	}

	function clearGestureRetry() {
		gestureRetryTarget = null;
	}

	function tryGestureFullscreen() {
		if (!gestureRetryTarget || isDocumentFullscreen()) {
			clearGestureRetry();
			return;
		}

		requestElementFullscreen(gestureRetryTarget).then((entered) => {
			if (entered) {
				clearGestureRetry();
			}
		});
	}

	function bindGestureFullscreenRetry() {
		if (gestureRetryBound) return;
		gestureRetryBound = true;

		document.addEventListener('pointerdown', tryGestureFullscreen, { passive: true });
		document.addEventListener('keydown', tryGestureFullscreen);
		document.addEventListener('fullscreenchange', onFullscreenChange);
		document.addEventListener('webkitfullscreenchange', onFullscreenChange);
		document.addEventListener('mozfullscreenchange', onFullscreenChange);
	}

	function onFullscreenChange() {
		if (isDocumentFullscreen()) {
			clearGestureRetry();
		}
	}

	function queueNativeFullscreen(target) {
		gestureRetryTarget = target || nativeFullscreenTarget();
		bindGestureFullscreenRetry();

		return requestElementFullscreen(gestureRetryTarget).then((entered) => {
			if (entered) {
				clearGestureRetry();
			}
		});
	}

	function enter(bodyFullscreenClass, targetId) {
		markPersistentMode();

		if (bodyFullscreenClass) {
			document.body.classList.add(bodyFullscreenClass);
		}

		// Fullscreen the document root (F11-like). targetId is for CSS layout only.
		queueNativeFullscreen(nativeFullscreenTarget());

		if (window.MobileLandscape?.lock) {
			window.MobileLandscape.lock();
		}
	}

	function exit(bodyFullscreenClass, options = {}) {
		if (options.clearPersistent) {
			clearPersistentMode();
		}

		clearGestureRetry();

		if (bodyFullscreenClass) {
			document.body.classList.remove(bodyFullscreenClass);
		}

		exitDocumentFullscreen();

		if (window.MobileLandscape?.unlock) {
			window.MobileLandscape.unlock();
		}
	}

	function sync(bodyFullscreenClass, contentVisible) {
		if (!bodyFullscreenClass || !contentVisible) return;

		if (isPersistentMode()) {
			document.body.classList.add(bodyFullscreenClass);
		}

		if (isDocumentFullscreen()) return;

		queueNativeFullscreen(nativeFullscreenTarget());
	}

	function applyPendingLayout(bodyFullscreenClass) {
		if (!bodyFullscreenClass || !document.body || !isPersistentMode()) return;
		document.body.classList.add(bodyFullscreenClass);
	}

	function navigateTo(url) {
		if (!url) return;
		markPersistentMode();
		window.location.href = url;
	}

	function leaveGame(url, bodyFullscreenClass) {
		clearPersistentMode();
		exit(bodyFullscreenClass, { clearPersistent: true });
		window.location.href = url;
	}

	function bootScreen({ bodyClass, arenaId }) {
		if (!bodyClass || !arenaId) return;

		function contentReady() {
			return Boolean(document.getElementById(arenaId));
		}

		function runEnter() {
			if (!contentReady()) return;
			enter(bodyClass, arenaId);
		}

		function runSync() {
			sync(bodyClass, contentReady());
		}

		applyPendingLayout(bodyClass);
		bindGestureFullscreenRetry();

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', runEnter);
		} else {
			runEnter();
		}

		document.addEventListener('fullscreenchange', runSync);
		document.addEventListener('webkitfullscreenchange', runSync);
		document.addEventListener('mozfullscreenchange', runSync);
		window.addEventListener('pageshow', (event) => {
			if (event.persisted && isPersistentMode()) {
				runSync();
			}
		});
	}

	window.GameFullscreen = {
		PERSIST_KEY,
		isDocumentFullscreen,
		isPersistentMode,
		markPersistentMode,
		clearPersistentMode,
		applyPendingLayout,
		bootScreen,
		navigateTo,
		leaveGame,
		enter,
		exit,
		sync,
		toggle: toggleElementFullscreen,
		request: requestElementFullscreen,
	};
})();
