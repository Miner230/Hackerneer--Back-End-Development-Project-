/**
 * Renders multiple delve enemies, target focus/zoom, and selection.
 */
(function () {
	const MONSTER_IMG_BASE =
		'https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/monsters/m';

	let selectedTargetEnemyId = null;
	let renderedEnemies = [];
	let focusMode = false;
	let focusControlsBound = false;

	function escapeHtml(text) {
		return String(text)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function formatCombatHp(value) {
		return Math.round(Number(value) || 0).toLocaleString('en-US');
	}

	function getStartHealthKey(enemyId) {
		const delveId = sessionStorage.getItem('delveID') || 'unknown';
		return `enemyStartHealth_${delveId}_${enemyId}`;
	}

	function getEnemyStartHealth(enemyId) {
		const stored = parseInt(sessionStorage.getItem(getStartHealthKey(enemyId)), 10);
		return Number.isFinite(stored) && stored > 0 ? stored : null;
	}

	function rememberEnemyStartHealth(enemy) {
		if (!enemy?.id) return;
		const key = getStartHealthKey(enemy.id);
		if (!sessionStorage.getItem(key) && enemy.max_health > 0) {
			sessionStorage.setItem(key, String(enemy.max_health));
		}
	}

	function getLivingEnemies(enemies = []) {
		return enemies.filter((enemy) => enemy.status !== 'dead' && Number(enemy.health) > 0);
	}

	function pickDefaultTarget(enemies = []) {
		const living = getLivingEnemies(enemies);
		if (!living.length) return null;

		if (
			selectedTargetEnemyId &&
			living.some((enemy) => String(enemy.id) === String(selectedTargetEnemyId))
		) {
			return selectedTargetEnemyId;
		}

		return living[0].id;
	}

	function isMultiEncounter() {
		return renderedEnemies.length > 1;
	}

	function getBoardElements() {
		return {
			board: document.getElementById('monsterBoard'),
			column: document.getElementById('monsterColumn'),
			prevBtn: document.getElementById('enemyFocusPrev'),
			nextBtn: document.getElementById('enemyFocusNext'),
			backBtn: document.getElementById('enemyFocusBack'),
		};
	}

	function renderModifierTags(mods = []) {
		if (!mods.length) return '';

		if (typeof groupMonsterModifiers === 'function') {
			return groupMonsterModifiers(mods)
				.map((mod) => {
					const label = mod.displayName || mod.name;
					const stackNote = mod.count > 1 ? ` (${mod.count} stacks)` : '';
					return `<span class="mod-tag" title="${escapeHtml(mod.description + stackNote)}">${escapeHtml(label)}</span>`;
				})
				.join('');
		}

		return mods
			.map((mod) => `<span class="mod-tag" title="${escapeHtml(mod.description || mod.name)}">${escapeHtml(mod.name)}</span>`)
			.join('');
	}

	function updateCombatTargetBanner(enemyId) {
		const banner = document.getElementById('combatTargetBanner');
		const nameEl = document.getElementById('combatTargetName');
		if (!banner || !nameEl) return;

		if (isMultiEncounter() && !focusMode) {
			banner.classList.add('combat-target-banner--hidden');
			return;
		}

		const enemy = renderedEnemies.find((entry) => String(entry.id) === String(enemyId));
		const living = getLivingEnemies(renderedEnemies);
		const showBanner =
			focusMode &&
			living.length > 0 &&
			enemy &&
			enemy.status !== 'dead' &&
			Number(enemy.health) > 0;

		if (!showBanner) {
			banner.classList.add('combat-target-banner--hidden');
			nameEl.textContent = '—';
			return;
		}

		banner.classList.remove('combat-target-banner--hidden');
		nameEl.textContent = enemy.monster_name || 'Unknown';
	}

	function updateFocusChrome() {
		const { column, prevBtn, nextBtn, backBtn } = getBoardElements();
		const living = getLivingEnemies(renderedEnemies);
		const show = focusMode && isMultiEncounter() && living.length > 0;

		column?.classList.toggle('monster-column--focused', show);
		if (prevBtn) prevBtn.hidden = !show || living.length < 2;
		if (nextBtn) nextBtn.hidden = !show || living.length < 2;
		if (backBtn) backBtn.hidden = !show;
	}

	function buildCompactEnemyCard(enemy, isSelected) {
		const isDead = enemy.status === 'dead' || Number(enemy.health) <= 0;
		const startHealth = getEnemyStartHealth(enemy.id) || enemy.max_health || enemy.health;
		const percent =
			startHealth > 0
				? Math.min(100, Math.max(0, Math.floor((Number(enemy.health) / startHealth) * 100)))
				: 0;

		return `
			<article
				class="combat-unit monster-unit delve-enemy-card delve-enemy-card--compact${isSelected ? ' delve-enemy-card--targeted' : ''}${isDead ? ' delve-enemy-card--dead' : ''}"
				data-enemy-id="${enemy.id}"
				data-monster-slot="${enemy.slot ?? 0}"
				role="button"
				tabindex="${isDead ? '-1' : '0'}"
				aria-pressed="${isSelected ? 'true' : 'false'}"
				aria-label="${escapeHtml(enemy.monster_name)}${isSelected ? ' — selected target' : ''}${isDead ? ' — defeated' : ''}"
			>
				<div class="delve-enemy-compact-stack">
					<header class="delve-enemy-compact-hud">
						<h2 class="delve-enemy-compact-name" title="${escapeHtml(enemy.monster_name)}">${escapeHtml(enemy.monster_name)}</h2>
						<div
							class="monster-health-bar delve-health-bar combat-unit-health delve-enemy-compact-health"
							data-enemy-stats="${enemy.id}"
							role="button"
							tabindex="0"
							title="View stats"
							aria-label="View ${escapeHtml(enemy.monster_name)} stats"
						>
							<div class="health-fill delve-enemy-health-fill" style="width:${percent}%;opacity:${percent === 0 ? 0 : 1}"></div>
							<div class="health-label">${percent}%</div>
						</div>
					</header>
					<div
						class="combat-display monster-display delve-enemy-focus-target"
						data-enemy-focus="${enemy.id}"
						title="Focus target"
					>
						<div class="monster-loot-layer delve-enemy-loot-layer" aria-hidden="true"></div>
						<img
							class="combat-sprite monster-img delve-enemy-img${isDead ? ' monster-death' : ''}"
							src="${MONSTER_IMG_BASE}${enemy.monster_id}.png"
							alt="${escapeHtml(enemy.monster_name)}"
						/>
					</div>
				</div>
				<p class="delve-enemy-compact-meta">Lv ${enemy.level ?? '?'} · SPD ${enemy.monster_speed ?? '?'}</p>
			</article>
		`;
	}

	function buildEnemyCard(enemy, isSelected, compact = false) {
		if (compact) return buildCompactEnemyCard(enemy, isSelected);

		const isDead = enemy.status === 'dead' || Number(enemy.health) <= 0;
		const startHealth = getEnemyStartHealth(enemy.id) || enemy.max_health || enemy.health;
		const percent =
			startHealth > 0
				? Math.min(100, Math.max(0, Math.floor((Number(enemy.health) / startHealth) * 100)))
				: 0;

		return `
			<article
				class="combat-unit monster-unit delve-enemy-card${isSelected ? ' delve-enemy-card--targeted' : ''}${isDead ? ' delve-enemy-card--dead' : ''}"
				data-enemy-id="${enemy.id}"
				data-monster-slot="${enemy.slot ?? 0}"
				role="button"
				tabindex="${isDead ? '-1' : '0'}"
				aria-pressed="${isSelected ? 'true' : 'false'}"
				aria-label="${escapeHtml(enemy.monster_name)}${isSelected ? ' — selected target' : ''}${isDead ? ' — defeated' : ''}"
			>
				${isSelected && !isDead ? '<div class="delve-enemy-target-badge" aria-hidden="true"><span class="delve-enemy-target-badge__reticle"></span>TARGET</div>' : ''}
				<header class="combat-unit-hud">
					<div class="combat-unit-header">
						<h2 class="combat-unit-name delve-enemy-name">${escapeHtml(enemy.monster_name)}</h2>
						<div class="combat-unit-meta">
							<span class="delve-meta-badge">Lv. ${enemy.level ?? '?'}</span>
							<span class="delve-meta-badge">SPD ${enemy.monster_speed ?? '?'}</span>
							<span class="delve-meta-badge delve-enemy-hp">HP ${formatCombatHp(enemy.health)}</span>
						</div>
					</div>
					<div class="monster-hp-stack">
						<div class="monster-health-bar delve-health-bar combat-unit-health">
							<div class="health-fill delve-enemy-health-fill" style="width:${percent}%;opacity:${percent === 0 ? 0 : 1}"></div>
							<div class="health-label">HP: ${percent}%</div>
						</div>
						<p class="combat-unit-hp-text">DR ${enemy.damage_reduction || 0}% · Regen ${enemy.life_regen || 0}</p>
					</div>
					<div class="combat-mod-tags monster-mod-tags">${renderModifierTags(enemy.modifiers || [])}</div>
				</header>
				<div class="combat-display monster-display monster-inspect-target" data-enemy-inspect="${enemy.id}" title="View stats">
					<div class="monster-loot-layer delve-enemy-loot-layer" aria-hidden="true"></div>
					<img
						class="combat-sprite monster-img delve-enemy-img${isDead ? ' monster-death' : ''}"
						src="${MONSTER_IMG_BASE}${enemy.monster_id}.png"
						alt="${escapeHtml(enemy.monster_name)}"
					/>
				</div>
			</article>
		`;
	}

	function openEnemyStats(enemyId) {
		if (typeof openMonsterStatsForEnemy === 'function') {
			openMonsterStatsForEnemy(enemyId);
		}
	}

	function bindEnemyBoardEvents(board) {
		board.querySelectorAll('.delve-enemy-card').forEach((card) => {
			const enemyId = card.dataset.enemyId;
			const isDead = card.classList.contains('delve-enemy-card--dead');
			const isCompact = card.classList.contains('delve-enemy-card--compact');

			card.querySelectorAll('[data-enemy-stats]').forEach((statsEl) => {
				const openStats = (event) => {
					event.stopPropagation();
					openEnemyStats(enemyId);
				};
				statsEl.addEventListener('click', openStats);
				statsEl.addEventListener('keydown', (event) => {
					if (event.key !== 'Enter' && event.key !== ' ') return;
					event.preventDefault();
					openStats(event);
				});
			});

			card.querySelectorAll('[data-enemy-focus]').forEach((focusEl) => {
				const enterFocus = (event) => {
					event.stopPropagation();
					if (isDead) {
						openEnemyStats(enemyId);
						return;
					}
					selectTargetEnemy(enemyId, { zoom: true });
				};
				focusEl.addEventListener('click', enterFocus);
				focusEl.addEventListener('keydown', (event) => {
					if (event.key !== 'Enter' && event.key !== ' ') return;
					event.preventDefault();
					enterFocus(event);
				});
			});

			const inspectTarget = card.querySelector('[data-enemy-inspect]');
			if (inspectTarget) {
				inspectTarget.addEventListener('click', (event) => {
					event.stopPropagation();
					openEnemyStats(enemyId);
				});
				inspectTarget.addEventListener('contextmenu', (event) => {
					event.preventDefault();
					openEnemyStats(enemyId);
				});
			}

			card.addEventListener('click', (event) => {
				if (event.target.closest('.monster-loot-drop')) return;
				if (event.target.closest('[data-enemy-stats]')) return;
				if (event.target.closest('[data-enemy-focus]')) return;
				if (event.target.closest('[data-enemy-inspect]')) return;

				if (isDead) {
					openEnemyStats(enemyId);
					return;
				}

				if (isCompact && isMultiEncounter() && !focusMode) {
					selectTargetEnemy(enemyId, { zoom: true });
				}
			});

			card.addEventListener('keydown', (event) => {
				if (event.key !== 'Enter' && event.key !== ' ') return;
				if (event.target.closest('[data-enemy-stats]')) return;
				event.preventDefault();
				if (isDead) {
					openEnemyStats(enemyId);
					return;
				}
				if (isCompact && isMultiEncounter() && !focusMode) {
					selectTargetEnemy(enemyId, { zoom: true });
				} else if (!isCompact) {
					selectTargetEnemy(enemyId, { zoom: false });
				}
			});
		});
	}

	function paintBoard() {
		const { board } = getBoardElements();
		if (!board) return;

		const isMulti = isMultiEncounter();
		board.classList.toggle('monster-board--multi', isMulti && !focusMode);
		board.classList.toggle('monster-board--focused', focusMode && isMulti);

		if (isMulti && !focusMode) {
			board.dataset.enemyCount = String(renderedEnemies.length);
		} else {
			delete board.dataset.enemyCount;
		}

		if (focusMode && isMulti) {
			const enemy =
				renderedEnemies.find((entry) => String(entry.id) === String(selectedTargetEnemyId)) ||
				getLivingEnemies(renderedEnemies)[0];
			if (!enemy) {
				focusMode = false;
				return paintBoard();
			}
			selectedTargetEnemyId = enemy.id;
			board.innerHTML = buildEnemyCard(enemy, true, false);
		} else {
			board.innerHTML = renderedEnemies
				.map((enemy) =>
					buildEnemyCard(
						enemy,
						String(enemy.id) === String(selectedTargetEnemyId),
						isMulti
					)
				)
				.join('');
		}

		bindEnemyBoardEvents(board);
		updateFocusChrome();
		updateCombatTargetBanner(selectedTargetEnemyId);
	}

	function enterFocusMode(enemyId) {
		if (!isMultiEncounter()) return;
		const living = getLivingEnemies(renderedEnemies);
		if (!living.length) return;

		const target =
			living.find((enemy) => String(enemy.id) === String(enemyId)) || living[0];
		selectedTargetEnemyId = target.id;
		focusMode = true;
		paintBoard();

		if (typeof registerMonsterStatsEnemies === 'function') {
			registerMonsterStatsEnemies(renderedEnemies);
		}
	}

	function exitFocusMode() {
		if (!focusMode) return;
		focusMode = false;
		paintBoard();
	}

	function cycleFocusTarget(step) {
		const living = getLivingEnemies(renderedEnemies);
		if (living.length < 2) return;

		const currentIndex = living.findIndex(
			(enemy) => String(enemy.id) === String(selectedTargetEnemyId)
		);
		const nextIndex =
			(currentIndex + step + living.length) % living.length;
		const nextEnemy = living[nextIndex];

		selectedTargetEnemyId = nextEnemy.id;
		paintBoard();

		if (typeof appendCombatLog === 'function') {
			appendCombatLog(`Targeting ${nextEnemy.monster_name}.`, 'info');
		}
		if (typeof registerMonsterStatsEnemies === 'function') {
			registerMonsterStatsEnemies(renderedEnemies);
		}
	}

	function bindFocusControls() {
		if (focusControlsBound) return;
		const { prevBtn, nextBtn, backBtn } = getBoardElements();

		prevBtn?.addEventListener('click', () => cycleFocusTarget(-1));
		nextBtn?.addEventListener('click', () => cycleFocusTarget(1));
		backBtn?.addEventListener('click', () => exitFocusMode());

		focusControlsBound = true;
	}

	function selectTargetEnemy(enemyId, options = {}) {
		const { zoom = false, silent = false } = options;
		const living = getLivingEnemies(renderedEnemies);
		const enemy = living.find((entry) => String(entry.id) === String(enemyId));
		if (!enemy) return;

		const changed = String(selectedTargetEnemyId) !== String(enemyId);
		selectedTargetEnemyId = enemyId;

		if (zoom && isMultiEncounter()) {
			enterFocusMode(enemyId);
		} else if (focusMode && isMultiEncounter()) {
			paintBoard();
		} else {
			const { board } = getBoardElements();
			board?.querySelectorAll('.delve-enemy-card').forEach((card) => {
				const isTarget = String(card.dataset.enemyId) === String(enemyId);
				card.classList.toggle('delve-enemy-card--targeted', isTarget);
				card.setAttribute('aria-pressed', isTarget ? 'true' : 'false');
			});
			updateCombatTargetBanner(enemyId);
		}

		if (changed && !silent && typeof appendCombatLog === 'function') {
			appendCombatLog(`Targeting ${enemy.monster_name}.`, 'info');
		}
	}

	function normalizeEnemies(delve) {
		if (Array.isArray(delve?.enemies) && delve.enemies.length) {
			return delve.enemies.map((enemy) => ({
				...enemy,
				id: enemy.id,
				monster_description: enemy.monster_description || delve.monster?.description || '',
			}));
		}

		return [
			{
				id: delve?.primary_enemy_id || 'legacy-primary',
				slot: 0,
				monster_id: delve?.monster?.id ?? delve?.monster_id,
				monster_name: delve?.monster?.name ?? delve?.monster_name ?? 'Unknown',
				monster_description: delve?.monster?.description ?? delve?.monster_description ?? '',
				level: delve?.level,
				health: delve?.health,
				max_health: delve?.health,
				life_regen: delve?.life_regen,
				damage_reduction: delve?.damage_reduction,
				monster_speed: delve?.monster_speed,
				item_quantity: delve?.item_quantity,
				item_rarity: delve?.item_rarity,
				roll_attempt: delve?.roll_attempt,
				status: delve?.health > 0 ? 'alive' : 'dead',
				modifiers: Array.isArray(delve?.modifiers) ? delve.modifiers : [],
			},
		];
	}

	function renderEnemyBoard(delve) {
		const { board } = getBoardElements();
		if (!board) return;

		bindFocusControls();
		renderedEnemies = normalizeEnemies(delve);
		renderedEnemies.forEach(rememberEnemyStartHealth);

		if (renderedEnemies.length <= 1) {
			focusMode = false;
		}

		selectedTargetEnemyId = pickDefaultTarget(renderedEnemies);
		paintBoard();

		if (typeof registerMonsterStatsEnemies === 'function') {
			registerMonsterStatsEnemies(renderedEnemies);
		}
	}

	function updateEnemyHealth(enemyId, currentHealth) {
		const card = document.querySelector(`.delve-enemy-card[data-enemy-id="${enemyId}"]`);
		const hp = Math.max(0, Math.round(Number(currentHealth) || 0));
		const startHealth = getEnemyStartHealth(enemyId) || hp || 1;
		const percent = Math.min(100, Math.max(0, Math.floor((hp / startHealth) * 100)));

		if (card) {
			const fill = card.querySelector('.delve-enemy-health-fill');
			const label = card.querySelector('.health-label');
			const hpBadge = card.querySelector('.delve-enemy-hp');

			if (fill) {
				fill.style.width = `${percent}%`;
				fill.style.opacity = percent === 0 ? '0' : '1';
			}
			if (label) {
				label.textContent = card.classList.contains('delve-enemy-card--compact')
					? `${percent}%`
					: `HP: ${percent}%`;
			}
			if (hpBadge) hpBadge.textContent = `HP ${formatCombatHp(hp)}`;

			if (hp <= 0) {
				card.classList.add('delve-enemy-card--dead');
				card.classList.remove('delve-enemy-card--targeted');
				card.querySelector('.delve-enemy-target-badge')?.remove();
				card.setAttribute('tabindex', '-1');
				const img = card.querySelector('.delve-enemy-img');
				if (img) img.classList.add('monster-death');
			}
		}

		const enemy = renderedEnemies.find((entry) => String(entry.id) === String(enemyId));
		if (enemy) {
			enemy.health = hp;
			if (enemy.status !== 'dead' && hp <= 0) enemy.status = 'dead';
		}

		if (hp <= 0 && focusMode && String(enemyId) === String(selectedTargetEnemyId)) {
			const living = getLivingEnemies(renderedEnemies);
			if (!living.length) {
				focusMode = false;
			} else {
				selectedTargetEnemyId = living[0].id;
			}
			paintBoard();
		}
	}

	function syncEnemyBoardFromStats(stats) {
		if (!stats?.enemies?.length) return;
		renderedEnemies = stats.enemies;
		stats.enemies.forEach((enemy) => {
			rememberEnemyStartHealth(enemy);
			updateEnemyHealth(enemy.id, enemy.health);
		});

		const living = getLivingEnemies(stats.enemies);
		if (
			selectedTargetEnemyId &&
			!living.some((enemy) => String(enemy.id) === String(selectedTargetEnemyId))
		) {
			selectedTargetEnemyId = living[0]?.id ?? null;
			if (!selectedTargetEnemyId) {
				focusMode = false;
				paintBoard();
				return;
			}
			selectTargetEnemy(selectedTargetEnemyId, { silent: true });
		}
	}

	function getSelectedTargetEnemyId() {
		return selectedTargetEnemyId;
	}

	function getEnemyById(enemyId) {
		return renderedEnemies.find((enemy) => String(enemy.id) === String(enemyId)) || null;
	}

	function getEnemyDisplayElement(enemyId) {
		const card = document.querySelector(`.delve-enemy-card[data-enemy-id="${enemyId}"]`);
		return card?.querySelector('.monster-display') || null;
	}

	function resetEnemyBoard() {
		selectedTargetEnemyId = null;
		renderedEnemies = [];
		focusMode = false;
		const { board } = getBoardElements();
		if (board) board.innerHTML = '';
		updateFocusChrome();
		updateCombatTargetBanner(null);
	}

	window.DelveEnemyBoard = {
		renderEnemyBoard,
		syncEnemyBoardFromStats,
		updateEnemyHealth,
		selectTargetEnemy,
		enterFocusMode,
		exitFocusMode,
		cycleFocusTarget,
		isFocusMode: () => focusMode,
		getSelectedTargetEnemyId,
		getEnemyById,
		getEnemyDisplayElement,
		getLivingEnemies,
		resetEnemyBoard,
		normalizeEnemies,
	};
})();
