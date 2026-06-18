//flip monster image horizontally at random intervals
document.addEventListener('DOMContentLoaded', () => {
	const monsterImg = document.getElementById('monsterImage');
	if (monsterImg) {
		const flipRandomly = () => {
			const shouldFlip = Math.random() > 0.5;
			monsterImg.classList.toggle('flip-horizontal', shouldFlip);
			const nextInterval = Math.random() * 3000 + 3000;
			setTimeout(flipRandomly, nextInterval);
		};
		flipRandomly();
	}

	const createDelveBtn = document.getElementById('createDelve');
	const startNextDelveBtn = document.getElementById('startNextDelveBtn');
	const exitDelveBtn = document.getElementById('exitDelveBtn');

	if (createDelveBtn) createDelveBtn.addEventListener('click', startDelve);
	if (startNextDelveBtn) startNextDelveBtn.addEventListener('click', startDelve);
	if (exitDelveBtn) exitDelveBtn.addEventListener('click', exitDelve);

	document.addEventListener('fullscreenchange', syncDelveFullscreenState);
});

//update player HUD from delve stats
function updatePlayerUI(delve) {
	const username = localStorage.getItem('username') || 'Hacker';
	const userLevel = localStorage.getItem('level') || delve.player_level || '?';

	const playerName = document.getElementById('playerName');
	const playerLevel = document.getElementById('playerLevel');
	const playerDR = document.getElementById('playerDR');
	const playerCurrentHP = document.getElementById('playerCurrentHP');
	const playerHealthFill = document.getElementById('playerHealthFill');
	const playerHealthLabel = document.getElementById('playerHealthLabel');

	const currentPlayerHealth = delve.player_health ?? delve.player_max_health ?? 0;
	const maxPlayerHealth = delve.player_max_health || parseInt(sessionStorage.getItem('maxPlayerHealth')) || 100;
	let playerPercent = Math.floor((currentPlayerHealth / maxPlayerHealth) * 100);
	playerPercent = Math.min(100, Math.max(0, playerPercent));

	if (playerName) playerName.textContent = username;
	if (playerLevel) playerLevel.textContent = `Lv. ${userLevel}`;
	const playerAttacks = document.getElementById('playerAttacks');
	if (playerAttacks) {
		playerAttacks.textContent = `ATK ${delve.attacks_remaining ?? delve.player_speed ?? '?'}/${delve.player_speed ?? '?'}`;
	}
	if (playerDR) playerDR.textContent = `DR ${delve.player_damage_reduction ?? 0}%`;
	const playerSpeedEl = document.getElementById('playerSpeed');
	if (playerSpeedEl) playerSpeedEl.textContent = `SPD ${delve.player_speed ?? '?'}`;
	if (playerCurrentHP) playerCurrentHP.textContent = `HP ${currentPlayerHealth} / ${maxPlayerHealth}`;
	if (playerHealthFill) {
		playerHealthFill.style.width = `${playerPercent}%`;
		playerHealthFill.style.opacity = playerPercent === 0 ? '0' : '1';
	}
	if (playerHealthLabel) playerHealthLabel.textContent = `HP: ${playerPercent}%`;

	updateTurnUI(delve);
}

function updateMonsterHealthUI(currentHealth) {
	const maxHealth = parseInt(sessionStorage.getItem('maxHealth')) || 100;
	let percent = Math.floor((currentHealth / maxHealth) * 100);
	percent = Math.min(100, Math.max(0, percent));

	const healthFill = document.getElementById('health-fill');
	const healthLabel = document.getElementById('health-label');
	const hpLabel = document.getElementById('monsterCurrentHP');

	if (healthFill) {
		healthFill.style.width = `${percent}%`;
		healthFill.style.opacity = percent === 0 ? '0' : '1';
	}
	if (healthLabel) healthLabel.textContent = `HP: ${percent}%`;
	if (hpLabel) hpLabel.textContent = `HP ${currentHealth}`;

	sessionStorage.setItem('delvePrevHealth', String(currentHealth));
}

//load delve info and render ui
function loadDelveInfo() {
	const delveDiv = document.getElementById('delveInfo');
	const storedDelveId = sessionStorage.getItem('delveID');

	const callback = (status, data) => {
		let delve = null;
		let monsterImageId = null;
		let monsterName = null;
		let monsterDesc = null;

		//parse backend data shapes
		if (data.stats) delve = data.stats;
		else if (data.createdInstance || data.Created_delve_instance) delve = data.createdInstance || data.Created_delve_instance;
		else if (data.currentInstance?.stats) delve = data.currentInstance.stats;
		else delve = Array.isArray(data) ? data[0] : data;

		//parse monster info
		if (data.stats) {
			monsterImageId = delve.monster_id;
			monsterName = delve.monster_name || 'Unknown';
			monsterDesc = delve.monster_description || '';
		} else if (data.createdInstance || data.Created_delve_instance) {
			monsterImageId = delve.monster?.id;
			monsterName = delve.monster?.name || 'Unknown';
			monsterDesc = delve.monster?.description || '';
		} else {
			monsterImageId = delve.monster?.id || delve.monster_id;
			monsterName = delve.monster?.name || delve.monster_name || 'Unknown';
			monsterDesc = delve.monster?.description || '';
		}

		//save max health once
		if (delve.health && !sessionStorage.getItem('maxHealth')) {
			sessionStorage.setItem('maxHealth', delve.health);
		}
		if (delve.player_max_health && !sessionStorage.getItem('maxPlayerHealth')) {
			sessionStorage.setItem('maxPlayerHealth', delve.player_max_health);
		}

		//save delve id
		if (delve.id) sessionStorage.setItem('delveID', delve.id);

		//update image and text
		const img = document.getElementById('monsterImage');
		const nameEl = document.getElementById('monsterName');
		const descEl = document.getElementById('monsterDesc');
		if (img) {
			img.classList.remove('monster-death', 'take-damage');
			void img.offsetWidth;
			img.src = `https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/monsters/m${monsterImageId}.png`;
			img.style.opacity = '1';
			img.style.filter = 'none';
		}
		if (nameEl) {
			nameEl.textContent = monsterName;
			nameEl.title = monsterDesc || '';
		}
		if (descEl) descEl.textContent = monsterDesc;

		//update monster health bar
		const currentHealth = delve.health || 0;

		updatePlayerUI(delve);

		const delveId = delve.id;
		const loggedDelveId = sessionStorage.getItem('delveLogInitialized');
		if (delveId && loggedDelveId !== String(delveId)) {
			appendCombatLog(`${monsterName} (Lv. ${delve.level || '?'}) appears!`, 'encounter');
			appendCombatLog(
				`Your SPD ${delve.player_speed || '?'} · Monster SPD ${delve.monster_speed || '?'} · Your DR ${delve.player_damage_reduction || 0}%`,
				'info'
			);
			if (delve.item_quantity > 0) {
				appendCombatLog(`Loot: ${delve.item_quantity} drop(s) — any rarity possible`, 'loot');
			}
			sessionStorage.setItem('delveLogInitialized', String(delveId));
		}

		const prevHealth = sessionStorage.getItem('delvePrevHealth');
		if (prevHealth !== null && currentHealth > parseInt(prevHealth, 10)) {
			appendCombatLog(`Monster regenerated ${currentHealth - parseInt(prevHealth, 10)} HP.`, 'info');
		}

		updateMonsterHealthUI(currentHealth);

		//update monster labels
		const levelLabel = document.getElementById('monsterLevel');
		const speedLabel = document.getElementById('monsterSpeed');
		const itemQuantityLabel = document.getElementById('monsterItemQuantity');
		const itemRarityLabel = document.getElementById('monsterItemRarity');
		const drText = document.getElementById('monsterDR');
		if (levelLabel) levelLabel.textContent = `Lv. ${delve.level || '?'}`;
		if (speedLabel) speedLabel.textContent = `SPD ${delve.monster_speed || '?'}`;
		if (itemQuantityLabel) itemQuantityLabel.textContent = `Qty ${delve.item_quantity ?? '?'}`;
		if (itemRarityLabel) itemRarityLabel.textContent = `Rarity ${delve.item_rarity ?? '?'}`;
		if (drText) {
			drText.textContent = `DR ${delve.damage_reduction || 0}% · Regen ${delve.life_regen || 0}`;
		}

		const modsEl = document.getElementById('monsterMods');
		if (modsEl) {
			const mods = Array.isArray(delve.modifiers) ? delve.modifiers : [];
			if (mods.length > 0) {
				modsEl.innerHTML = mods
					.map((mod) => `<span class="mod-tag" title="${mod.description || mod.name}">${mod.name}</span>`)
					.join('');
			} else {
				modsEl.innerHTML = '';
			}
		}

		updateTurnUI(delve);
	};

	//auth check
	if (!token) {
		delveDiv.innerHTML = `<div class="text-danger text-center">User not logged in.</div>`;
		return;
	}

	//fetch delve data
	if (storedDelveId) fetchMethod(`${currentUrl}/api/delve/${storedDelveId}`, callback, 'GET', null, token);
	else fetchMethod(`${currentUrl}/api/delve/createInstance`, callback, 'GET', null, token);
}

//start new delve
function startDelve() {
	playPixelTransition(() => {
		document.getElementById('delveStartOverlay')?.classList.add('d-none');
		document.getElementById('createDelve')?.classList.add('d-none');
		document.getElementById('delveEndOverlay')?.classList.add('d-none');
		const mainContent = document.getElementById('mainContent');
		if (mainContent) mainContent.classList.remove('d-none');

		sessionStorage.removeItem('delveID');
		sessionStorage.removeItem('maxHealth');
		sessionStorage.removeItem('maxPlayerHealth');
		sessionStorage.removeItem('delveLogInitialized');
		sessionStorage.removeItem('delvePrevHealth');

		const rollBtn = document.querySelector('.roll');
		if (rollBtn) {
			rollBtn.disabled = false;
			rollBtn.classList.remove('disabled');
		}

		clearCombatLog();
		enterDelveFullscreen();
		animateDiceRollSequence([], { showPrompt: true });
		loadDelveInfo();
	});
}

function enterDelveFullscreen() {
	document.body.classList.add('delve-fullscreen');

	const target = document.getElementById('mainContent') || document.documentElement;
	const request =
		target.requestFullscreen?.() ||
		target.webkitRequestFullscreen?.() ||
		target.msRequestFullscreen?.();

	if (request?.catch) {
		request.catch(() => {});
	}

	if (window.MobileLandscape?.lock) {
		window.MobileLandscape.lock();
	}
}

function exitDelveFullscreen() {
	document.body.classList.remove('delve-fullscreen');

	if (document.fullscreenElement || document.webkitFullscreenElement) {
		const exit =
			document.exitFullscreen?.() ||
			document.webkitExitFullscreen?.() ||
			document.msExitFullscreen?.();
		if (exit?.catch) exit.catch(() => {});
	}

	if (window.MobileLandscape?.unlock) {
		window.MobileLandscape.unlock();
	}
}

function syncDelveFullscreenState() {
	const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
	const mainVisible = !document.getElementById('mainContent')?.classList.contains('d-none');

	if (isFullscreen && mainVisible) {
		document.body.classList.add('delve-fullscreen');
		return;
	}

	if (!isFullscreen && mainVisible) {
		document.body.classList.add('delve-fullscreen');
	}
}

function exitDelve() {
	exitDelveFullscreen();

	sessionStorage.removeItem('delveID');
	sessionStorage.removeItem('maxHealth');
	sessionStorage.removeItem('maxPlayerHealth');
	sessionStorage.removeItem('delveLogInitialized');
	sessionStorage.removeItem('delvePrevHealth');

	window.location.href = 'profile.html';
}

//close delve overlay
function closeDelveOverlay() {
	document.getElementById('delveStartOverlay').classList.add('d-none');
}

//pixel transition animation
function playPixelTransition(callback) {
	const overlay = document.getElementById('pixelTransitionOverlay');
	overlay.innerHTML = '';
	overlay.classList.remove('d-none');

	const cols = 40;
	const rows = 25;
	const totalBlocks = cols * rows;

	overlay.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
	overlay.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

	//generate pixel blocks
	for (let i = 0; i < totalBlocks; i++) {
		const block = document.createElement('div');
		block.className = 'pixel-transition-block';
		block.style.animationDelay = `${Math.random() * 0.2}s`;
		overlay.appendChild(block);
	}

	//execute callback then fade out
	setTimeout(() => {
		if (callback) callback();
		const blocks = overlay.querySelectorAll('.pixel-transition-block');
		blocks.forEach((block) => {
			block.style.animation = 'pixelUnfade 0.5s ease-in-out forwards';
			block.style.animationDelay = `${Math.random() * 0.3}s`;
		});
		setTimeout(() => {
			overlay.classList.add('d-none');
			overlay.innerHTML = '';
		}, 2000);
	}, 700);
}
