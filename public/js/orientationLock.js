(function () {
	const OVERLAY_ID = 'landscapeRequiredOverlay';
	const PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 900px)';

	function shouldRequireLandscape() {
		return window.matchMedia(PORTRAIT_QUERY).matches;
	}

	function ensureOverlay() {
		let overlay = document.getElementById(OVERLAY_ID);
		if (overlay) return overlay;

		overlay = document.createElement('div');
		overlay.id = OVERLAY_ID;
		overlay.className = 'landscape-required-overlay d-none';
		overlay.setAttribute('role', 'alertdialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.setAttribute('aria-labelledby', 'landscapeRequiredTitle');
		overlay.innerHTML = `
			<div class="landscape-required-icon" aria-hidden="true"></div>
			<h2 id="landscapeRequiredTitle" class="landscape-required-title">Rotate your device</h2>
			<p class="landscape-required-message">
				Hackerneer is played in landscape on mobile. Turn your phone sideways to continue.
			</p>
		`;

		document.body.appendChild(overlay);
		return overlay;
	}

	function updateLandscapeGate() {
		const blocked = shouldRequireLandscape();
		const overlay = ensureOverlay();

		overlay.classList.toggle('d-none', !blocked);
		document.body.classList.toggle('landscape-blocked', blocked);
	}

	async function lockLandscape() {
		if (!screen.orientation?.lock) return false;

		try {
			await screen.orientation.lock('landscape');
			return true;
		} catch {
			return false;
		}
	}

	function unlockLandscape() {
		if (!screen.orientation?.unlock) return;
		try {
			screen.orientation.unlock();
		} catch {
			/* ignore */
		}
	}

	window.MobileLandscape = {
		shouldRequireLandscape,
		update: updateLandscapeGate,
		lock: lockLandscape,
		unlock: unlockLandscape,
	};

	const portraitMedia = window.matchMedia(PORTRAIT_QUERY);
	if (portraitMedia.addEventListener) {
		portraitMedia.addEventListener('change', updateLandscapeGate);
	} else if (portraitMedia.addListener) {
		portraitMedia.addListener(updateLandscapeGate);
	}

	window.addEventListener('orientationchange', updateLandscapeGate);
	window.addEventListener('resize', updateLandscapeGate);

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', updateLandscapeGate);
	} else {
		updateLandscapeGate();
	}
})();
