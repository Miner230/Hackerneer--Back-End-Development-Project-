//flip monster sprites horizontally at random intervals
function initDelvePage() {
	const flipRandomly = () => {
		const imgs = document.querySelectorAll('.delve-enemy-img');
		imgs.forEach((monsterImg) => {
			monsterImg.classList.toggle('flip-horizontal', Math.random() > 0.5);
		});
		setTimeout(flipRandomly, Math.random() * 3000 + 3000);
	};
	flipRandomly();

	const createDelveBtn = document.getElementById('createDelve');
	const startNextDelveBtn = document.getElementById('startNextDelveBtn');
	const exitDelveBtn = document.getElementById('exitDelveBtn');
	const exitDelveEndBtn = document.getElementById('exitDelveEndBtn');

	if (createDelveBtn) createDelveBtn.addEventListener('click', startDelve);
	if (startNextDelveBtn) {
		startNextDelveBtn.addEventListener('click', () => {
			if (typeof DungeonRunApi !== 'undefined' && DungeonRunApi.hasPendingDungeonRoom()) {
				const outcome = sessionStorage.getItem('delveLastOutcome');
				sessionStorage.removeItem('delveLastOutcome');

				if (outcome === 'win') {
					DungeonRunApi.finishDungeonRoomVictory();
				} else {
					DungeonRunApi.setPendingDungeonRoom(null);
					DungeonRunApi.returnToDungeonMap();
				}
				return;
			}
			startDelve();
		});
	}
	if (exitDelveBtn) exitDelveBtn.addEventListener('click', exitDelve);
	if (exitDelveEndBtn) exitDelveEndBtn.addEventListener('click', exitDelve);

	document.addEventListener('fullscreenchange', syncDelveFullscreenState);
	document.addEventListener('webkitfullscreenchange', syncDelveFullscreenState);

	bindPageFullscreen({
		bodyClass: 'delve-fullscreen',
		arenaId: 'delvePlayArena',
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initDelvePage);
} else {
	initDelvePage();
}

//update player HUD from delve stats
function updatePlayerHealthUI(currentHealth, maxHealthOverride) {
	const storedMax = parseInt(sessionStorage.getItem('maxPlayerHealth'), 10);
	const maxPlayerHealth =
		maxHealthOverride ?? (Number.isFinite(storedMax) && storedMax > 0 ? storedMax : 100);
	const hp = Math.max(0, Math.round(Number(currentHealth) || 0));
	const percentExact =
		maxPlayerHealth > 0 ? Math.min(100, Math.max(0, (hp / maxPlayerHealth) * 100)) : 0;

	const playerCurrentHP = document.getElementById('playerCurrentHP');
	const playerHealthFill = document.getElementById('playerHealthFill');
	const playerHealthLabel = document.getElementById('playerHealthLabel');

	if (playerCurrentHP) {
		playerCurrentHP.textContent = `HP ${formatCombatHp(hp)}`;
	}
	if (playerHealthFill) {
		playerHealthFill.style.width = `${percentExact}%`;
		playerHealthFill.style.opacity = percentExact === 0 ? '0' : '1';
	}
	if (playerHealthLabel) {
		playerHealthLabel.textContent = `HP: ${Math.round(percentExact)}%`;
	}
}

const DELVE_PLAYER_LEVEL_KEY = 'delvePlayerLevel';

function getDelvePlayerLevel(delve) {
	const sessionLevel = sessionStorage.getItem(DELVE_PLAYER_LEVEL_KEY);
	if (sessionLevel) return sessionLevel;
	if (delve?.player_level != null) return delve.player_level;
	const storedLevel = localStorage.getItem('level');
	return storedLevel || '?';
}

function syncDelvePlayerLevel(level) {
	const parsed = Number(level);
	if (!Number.isFinite(parsed) || parsed < 1) return;

	const levelText = String(parsed);
	sessionStorage.setItem(DELVE_PLAYER_LEVEL_KEY, levelText);
	localStorage.setItem('level', levelText);

	const playerLevel = document.getElementById('playerLevel');
	if (playerLevel) playerLevel.textContent = `Lv. ${levelText}`;

	if (typeof updateNavbarProfileLabel === 'function') {
		updateNavbarProfileLabel();
	}
}

function applyDelveXpGain(xp) {
	if (!xp?.gained) return;

	if (xp.level != null) {
		syncDelvePlayerLevel(xp.level);
	}

	const levelsGained = Number(xp.levelsGained) || 0;
	if (levelsGained <= 0 || typeof showConfettiOverlay !== 'function') return;

	const newLevel = xp.level ?? getDelvePlayerLevel();
	const message =
		levelsGained > 1 ? `Level up ×${levelsGained}! Lv. ${newLevel}` : `Level up! Lv. ${newLevel}`;
	showConfettiOverlay(message);
}

function updatePlayerUI(delve) {
	const username = localStorage.getItem('username') || 'Hacker';
	if (delve?.player_level != null) {
		syncDelvePlayerLevel(delve.player_level);
	}
	const userLevel = getDelvePlayerLevel(delve);

	const playerName = document.getElementById('playerName');
	const playerLevel = document.getElementById('playerLevel');
	const playerDR = document.getElementById('playerDR');

	const currentPlayerHealth = delve.player_health ?? delve.player_max_health ?? 0;
	const maxPlayerHealth = delve.player_max_health || parseInt(sessionStorage.getItem('maxPlayerHealth')) || 100;

	if (playerName) playerName.textContent = username;
	if (playerLevel) playerLevel.textContent = `Lv. ${userLevel}`;
	const playerTurns = document.getElementById('playerTurns');
	if (playerTurns) {
		const remaining = delve.attacks_remaining ?? delve.player_speed ?? '?';
		const speed = delve.player_speed ?? '?';
		playerTurns.textContent = `TRN ${remaining}/${speed}`;
	}
	if (playerDR) playerDR.textContent = `DR ${delve.player_damage_reduction ?? 0}%`;
	const playerSpeedEl = document.getElementById('playerSpeed');
	if (playerSpeedEl) playerSpeedEl.textContent = `SPD ${delve.player_speed ?? '?'}`;

	updatePlayerHealthUI(currentPlayerHealth, maxPlayerHealth);

	updateTurnUI(delve);
}

window.syncDelvePlayerLevel = syncDelvePlayerLevel;
window.applyDelveXpGain = applyDelveXpGain;
window.getDelvePlayerLevel = getDelvePlayerLevel;

function getMonsterStartHealthKey(delveId) {
	return delveId ? `monsterStartHealth_${delveId}` : 'monsterStartHealth';
}

function formatCombatHp(value) {
	const amount = Math.round(Number(value) || 0);
	return amount.toLocaleString('en-US');
}

function escapeHtml(text) {
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function groupMonsterModifiers(mods = []) {
	if (typeof groupModifiersWithTiers === 'function') {
		return groupModifiersWithTiers(mods);
	}

	const grouped = new Map();

	mods.forEach((mod) => {
		const name = mod?.name || 'Unknown';
		const existing = grouped.get(name);

		if (existing) {
			existing.count += 1;
			return;
		}

		grouped.set(name, {
			name,
			count: 1,
			description: mod?.description || name,
			displayName: name,
		});
	});

	return Array.from(grouped.values()).sort(
		(a, b) => b.count - a.count || a.name.localeCompare(b.name)
	);
}

function renderMonsterModifierTags(modsEl, mods = []) {
	if (!modsEl) return;

	const grouped = groupMonsterModifiers(mods);
	if (!grouped.length) {
		modsEl.innerHTML = '';
		return;
	}

	modsEl.innerHTML = grouped
		.map((mod) => {
			const label = mod.displayName || mod.name;
			const stackNote = mod.count > 1 ? ` (${mod.count} stacks of ${mod.name})` : '';
			return `<span class="mod-tag" title="${escapeHtml(mod.description + stackNote)}">${escapeHtml(label)}</span>`;
		})
		.join('');
}

function getMonsterStartHealth() {
	const delveId = sessionStorage.getItem('delveID');
	const stored = parseInt(sessionStorage.getItem(getMonsterStartHealthKey(delveId)), 10);
	return Number.isFinite(stored) && stored > 0 ? stored : null;
}

function resolveMonsterHealthBeforeAttack(stats, raw) {
	const targetId =
		stats?.target_enemy_id ||
		DelveEnemyBoard?.getSelectedTargetEnemyId?.() ||
		stats?.enemies?.find((enemy) => enemy.status !== 'dead')?.id;

	const targetEnemy = stats?.enemies?.find(
		(enemy) => String(enemy.id) === String(targetId)
	);

	if (targetEnemy) {
		const damageDealt = Number(raw?.playerDamageToMonster) || 0;
		return Math.max(0, (targetEnemy.health ?? 0) + damageDealt);
	}

	const prev = parseInt(sessionStorage.getItem('delvePrevHealth'), 10);
	const post = stats?.health ?? 0;

	if (Number.isFinite(prev) && prev >= post) {
		return prev;
	}

	const damageDealt = Number(raw?.playerDamageToMonster) || 0;
	return post + damageDealt;
}

function updateMonsterHealthUI(currentHealth, enemyId) {
	const targetId = enemyId || DelveEnemyBoard?.getSelectedTargetEnemyId?.();
	if (DelveEnemyBoard && targetId) {
		DelveEnemyBoard.updateEnemyHealth(targetId, currentHealth);
		if (typeof patchMonsterStats === 'function') {
			patchMonsterStats({ health: currentHealth });
		}
		return;
	}

	const hp = Math.round(Number(currentHealth) || 0);
	sessionStorage.setItem('delvePrevHealth', String(hp));
}

//load delve info and render ui
function loadDelveInfo() {
	const delveDiv = document.getElementById('delveInfo');
	const storedDelveId = sessionStorage.getItem('delveID');

	const callback = async (status, data) => {
		let delve = null;

		if (data.stats) delve = data.stats;
		else if (data.createdInstance || data.Created_delve_instance) delve = data.createdInstance || data.Created_delve_instance;
		else if (data.currentInstance?.stats) delve = data.currentInstance.stats;
		else delve = Array.isArray(data) ? data[0] : data;

		if (delve?.id) sessionStorage.setItem('delveID', delve.id);

		const enemies = DelveEnemyBoard?.normalizeEnemies?.(delve) || [];
		DelveEnemyBoard?.renderEnemyBoard?.(delve);

		updatePlayerUI(delve);

		if (delve.player_max_health && !sessionStorage.getItem('maxPlayerHealth')) {
			sessionStorage.setItem('maxPlayerHealth', delve.player_max_health);
		}

		const delveId = delve.id;
		const loggedDelveId = sessionStorage.getItem('delveLogInitialized');
		if (delveId && loggedDelveId !== String(delveId)) {
			const encounterSummary =
				enemies.length > 1
					? `${enemies.length} enemies appear`
					: `${enemies[0]?.monster_name || delve.monster?.name || 'Enemy'} (Lv. ${enemies[0]?.level || delve.level || '?'}) appears`;

			appendCombatLog(
				`${encounterSummary}! · Your SPD ${delve.player_speed || '?'} · DR ${delve.player_damage_reduction || 0}%${delve.item_quantity > 0 ? ` · ${delve.item_quantity} loot drop(s)` : ''}`,
				'encounter'
			);
			sessionStorage.setItem('delveLogInitialized', String(delveId));

			await setTurnIndicator('Battle start!', 'waiting', { showPopup: true });
			if (enemies.length > 1) {
				appendCombatLog('Click a sprite to focus · click its HP bar for stats.', 'info');
			}
			updateTurnUI(delve, { showPopup: true });
		}

		DelveEnemyBoard?.syncEnemyBoardFromStats?.(delve);

		if (!(delveId && loggedDelveId !== String(delveId))) {
			updateTurnUI(delve);
		}
	};

	//auth check
	if (!token) {
		delveDiv.innerHTML = `<div class="text-danger text-center">User not logged in.</div>`;
		return;
	}

	//fetch delve data
	const encounterCount = sessionStorage.getItem('delveEncounterCount');
	const createUrl = encounterCount
		? `${currentUrl}/api/delve/createInstance?count=${encodeURIComponent(encounterCount)}`
		: `${currentUrl}/api/delve/createInstance`;

	if (storedDelveId) fetchMethod(`${currentUrl}/api/delve/${storedDelveId}`, callback, 'GET', null, token);
	else fetchMethod(createUrl, callback, 'GET', null, token);
}

//start new delve
function startDelve() {
	playPixelTransition(() => {
		document.getElementById('delveStartOverlay')?.classList.add('d-none');
		document.getElementById('createDelve')?.classList.add('d-none');
		document.getElementById('delveEndOverlay')?.classList.add('d-none');
		const mainContent = document.getElementById('mainContent');
		if (mainContent) mainContent.classList.remove('d-none');

		sessionStorage.removeItem('maxHealth');
		sessionStorage.removeItem('delveID');
		sessionStorage.removeItem('maxPlayerHealth');
		sessionStorage.removeItem('delveLogInitialized');
		sessionStorage.removeItem('delvePrevHealth');
		sessionStorage.removeItem(DELVE_PLAYER_LEVEL_KEY);

		const rollBtn = document.querySelector('.roll');
		if (rollBtn) {
			rollBtn.disabled = false;
			rollBtn.classList.remove('disabled');
		}

		clearCombatLog();
		if (typeof closeMonsterStatsSheet === 'function') closeMonsterStatsSheet();
		if (typeof setMonsterStats === 'function') setMonsterStats(null);
		DelveEnemyBoard?.resetEnemyBoard?.();
		enterDelveFullscreen();
		loadDelveInfo();
	});
}

function enterDelveFullscreen() {
	GameFullscreen.enter('delve-fullscreen', 'delvePlayArena');
}

function exitDelveFullscreen() {
	GameFullscreen.exit('delve-fullscreen');
}

function syncDelveFullscreenState() {
	GameFullscreen.sync('delve-fullscreen', Boolean(document.getElementById('delvePlayArena')));
}

function exitDelve() {
	sessionStorage.removeItem('delveID');
	sessionStorage.removeItem('maxHealth');
	sessionStorage.removeItem('maxPlayerHealth');
	sessionStorage.removeItem('delveLogInitialized');
	sessionStorage.removeItem('delvePrevHealth');

	GameFullscreen.navigateTo('world.html');
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
