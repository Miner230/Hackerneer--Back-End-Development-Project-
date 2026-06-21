let activeMonsterStats = null;
let isMonsterStatsOpen = false;

function escapeStatHtml(text) {
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function formatStatHp(value) {
	return Math.round(Number(value) || 0).toLocaleString('en-US');
}

function groupStatsModifiers(mods = []) {
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

function getMonsterStatsStartHealth() {
	const delveId = sessionStorage.getItem('delveID');
	const key = delveId ? `monsterStartHealth_${delveId}` : 'monsterStartHealth';
	const stored = parseInt(sessionStorage.getItem(key), 10);
	return Number.isFinite(stored) && stored > 0 ? stored : null;
}

function getMonsterStatusLabel(stats) {
	const currentHealth = stats.health ?? 0;

	if (stats.status === 'completed') {
		return currentHealth <= 0 ? 'Defeated' : 'Encounter ended';
	}

	return 'In combat';
}

function formatMonsterHealthLine(stats) {
	const startHealth = stats.start_health ?? getMonsterStatsStartHealth();
	const currentHealth = stats.health ?? 0;

	if (startHealth && startHealth !== currentHealth) {
		return `${formatStatHp(currentHealth)} / ${formatStatHp(startHealth)}`;
	}

	return formatStatHp(currentHealth);
}

// Add new monster stats here — they render automatically in the inspect sheet.
function buildMonsterStatRows(stats) {
	return [
		{ label: 'Level', value: stats.level ?? '?' },
		{ label: 'Health', value: formatMonsterHealthLine(stats) },
		{ label: 'Damage reduction', value: `${stats.damage_reduction ?? 0}%` },
		{ label: 'Life regen', value: `${stats.life_regen ?? 0} / turn` },
		{ label: 'Turn speed', value: `${stats.monster_speed ?? '?'} rolls / round` },
		{ label: 'Loot quantity', value: `${stats.item_quantity ?? '?'} drop(s)` },
		{ label: 'Loot rarity', value: stats.item_rarity ?? '?' },
		{ label: 'Roll attempts', value: stats.roll_attempt ?? '?' },
		{ label: 'Status', value: getMonsterStatusLabel(stats) },
	];
}

function statLabelToKey(label) {
	return String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function renderMonsterStatRows(rows, startIndex = 0) {
	return rows
		.map(
			(row, index) => `
			<div class="monster-stat-row" data-stat-key="${statLabelToKey(row.label)}" style="--row-i: ${startIndex + index}">
				<dt>${escapeStatHtml(row.label)}</dt>
				<dd>${escapeStatHtml(row.value)}</dd>
			</div>`
		)
		.join('');
}

function refreshMonsterStatsSheetValues() {
	const body = document.getElementById('monsterStatsSheetBody');
	if (!body || !activeMonsterStats) return false;

	const grid = body.querySelector('.monster-stats-grid');
	if (!grid) return false;

	const statRows = buildMonsterStatRows(activeMonsterStats);

	statRows.forEach((row) => {
		const valueEl = grid.querySelector(`[data-stat-key="${statLabelToKey(row.label)}"] dd`);
		if (valueEl) valueEl.textContent = row.value;
	});

	return true;
}

function canLiveUpdateMonsterStatsSheet(prev, next) {
	if (!prev || !next) return false;

	return (
		prev.monster_id === next.monster_id &&
		prev.monster_name === next.monster_name &&
		(prev.modifiers?.length ?? 0) === (next.modifiers?.length ?? 0) &&
		Boolean(document.getElementById('monsterStatsSheetBody')?.querySelector('.monster-stats-grid'))
	);
}

function renderMonsterStatsSheet({ animate = true } = {}) {
	const body = document.getElementById('monsterStatsSheetBody');
	const title = document.getElementById('monsterStatsSheetTitle');
	const portrait = document.getElementById('monsterStatsSheetPortrait');

	if (!body || !activeMonsterStats) return;

	const stats = activeMonsterStats;
	const statRows = buildMonsterStatRows(stats);
	const groupedMods = groupStatsModifiers(stats.modifiers);

	if (title) title.textContent = stats.monster_name || 'Monster';
	if (portrait && stats.monster_id) {
		portrait.src = `https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/monsters/m${stats.monster_id}.png`;
		portrait.alt = stats.monster_name || 'Monster';
	}

	body.classList.toggle('monster-stats-sheet-body--static', !animate);

	body.innerHTML = `
		<p class="monster-stats-sheet-desc">${escapeStatHtml(stats.monster_description || 'No description available.')}</p>
		<dl class="monster-stats-grid">
			${renderMonsterStatRows(statRows)}
		</dl>
		${
			groupedMods.length
				? `<section class="monster-stats-mods">
					<h3 class="monster-stats-mods-title">Modifiers</h3>
					<ul class="monster-stats-mod-list">
						${groupedMods
							.map(
								(mod, index) => `
							<li class="monster-stats-mod-item" style="--row-i: ${statRows.length + index}">
								<span class="monster-stats-mod-name">${escapeStatHtml(mod.displayName || mod.name)}</span>
								<span class="monster-stats-mod-desc">${escapeStatHtml(mod.description)}${mod.count > 1 ? ` (${mod.count}× ${mod.name})` : ''}</span>
							</li>`
							)
							.join('')}
					</ul>
				</section>`
				: `<p class="monster-stats-no-mods" style="--row-i: ${statRows.length}">No modifiers on this monster.</p>`
		}
	`;
}

function updateMonsterStatsSheetView(prevStats) {
	if (!isMonsterStatsOpen) return;

	if (canLiveUpdateMonsterStatsSheet(prevStats, activeMonsterStats)) {
		refreshMonsterStatsSheetValues();
		return;
	}

	renderMonsterStatsSheet({ animate: false });
}

function openMonsterStatsSheet() {
	if (!activeMonsterStats) return;

	const sheet = document.getElementById('monsterStatsSheet');
	if (!sheet) return;

	renderMonsterStatsSheet({ animate: true });
	sheet.classList.add('is-open');
	sheet.setAttribute('aria-hidden', 'false');
	isMonsterStatsOpen = true;

	requestAnimationFrame(() => {
		sheet.classList.add('is-visible');
	});
}

function closeMonsterStatsSheet() {
	const sheet = document.getElementById('monsterStatsSheet');
	if (!sheet || !isMonsterStatsOpen) return;

	sheet.classList.remove('is-visible');
	isMonsterStatsOpen = false;

	window.setTimeout(() => {
		sheet.classList.remove('is-open');
		sheet.setAttribute('aria-hidden', 'true');
	}, 300);
}

function toggleMonsterStatsSheet() {
	if (isMonsterStatsOpen) closeMonsterStatsSheet();
	else openMonsterStatsSheet();
}

function setMonsterStats(stats) {
	if (!stats) {
		activeMonsterStats = null;
		return;
	}

	const prevStats = activeMonsterStats;

	activeMonsterStats = {
		...stats,
		modifiers: Array.isArray(stats.modifiers) ? [...stats.modifiers] : [],
	};

	updateMonsterStatsSheetView(prevStats);
}

function patchMonsterStats(partial) {
	if (!activeMonsterStats || !partial) return;

	const prevStats = { ...activeMonsterStats, modifiers: [...activeMonsterStats.modifiers] };

	activeMonsterStats = {
		...activeMonsterStats,
		...partial,
		modifiers: partial.modifiers
			? Array.isArray(partial.modifiers)
				? [...partial.modifiers]
				: activeMonsterStats.modifiers
			: activeMonsterStats.modifiers,
	};

	updateMonsterStatsSheetView(prevStats);
}

function syncMonsterStatsFromDelve(delve) {
	if (!delve) return;

	setMonsterStats({
		...(activeMonsterStats || {}),
		monster_id: delve.monster_id ?? activeMonsterStats?.monster_id,
		monster_name: delve.monster_name ?? activeMonsterStats?.monster_name,
		monster_description: delve.monster_description ?? activeMonsterStats?.monster_description,
		level: delve.level ?? activeMonsterStats?.level,
		health: delve.health ?? activeMonsterStats?.health,
		start_health: getMonsterStatsStartHealth() ?? activeMonsterStats?.start_health,
		life_regen: delve.life_regen ?? activeMonsterStats?.life_regen,
		damage_reduction: delve.damage_reduction ?? activeMonsterStats?.damage_reduction,
		monster_speed: delve.monster_speed ?? activeMonsterStats?.monster_speed,
		item_quantity: delve.item_quantity ?? activeMonsterStats?.item_quantity,
		item_rarity: delve.item_rarity ?? activeMonsterStats?.item_rarity,
		roll_attempt: delve.roll_attempt ?? activeMonsterStats?.roll_attempt,
		status: delve.status ?? activeMonsterStats?.status,
		modifiers: delve.modifiers ?? activeMonsterStats?.modifiers ?? [],
	});
}

function buildMonsterStatsSnapshotFromEnemy(enemy) {
	const delveId = sessionStorage.getItem('delveID');
	const startKey = delveId ? `enemyStartHealth_${delveId}_${enemy.id}` : null;
	const storedStart = startKey ? parseInt(sessionStorage.getItem(startKey), 10) : NaN;

	return {
		enemy_id: enemy.id,
		monster_id: enemy.monster_id,
		monster_name: enemy.monster_name,
		monster_description: enemy.monster_description,
		level: enemy.level,
		health: enemy.health,
		start_health: Number.isFinite(storedStart) && storedStart > 0 ? storedStart : enemy.max_health || enemy.health,
		life_regen: enemy.life_regen,
		damage_reduction: enemy.damage_reduction,
		monster_speed: enemy.monster_speed,
		item_quantity: enemy.item_quantity,
		item_rarity: enemy.item_rarity,
		roll_attempt: enemy.roll_attempt,
		status: enemy.status,
		modifiers: Array.isArray(enemy.modifiers) ? enemy.modifiers : [],
	};
}

function registerMonsterStatsEnemies(enemies = []) {
	if (!enemies.length) return;

	const selectedId =
		typeof DelveEnemyBoard !== 'undefined'
			? DelveEnemyBoard.getSelectedTargetEnemyId()
			: enemies[0]?.id;
	const selected =
		enemies.find((enemy) => String(enemy.id) === String(selectedId)) || enemies[0];
	setMonsterStats(buildMonsterStatsSnapshotFromEnemy(selected));
}

function openMonsterStatsForEnemy(enemyId) {
	if (typeof DelveEnemyBoard === 'undefined') return;
	const enemy = DelveEnemyBoard.getEnemyById(enemyId);
	if (!enemy) return;

	setMonsterStats(buildMonsterStatsSnapshotFromEnemy(enemy));
	openMonsterStatsSheet();
}

function buildMonsterStatsSnapshot(delve, monsterImageId, monsterName, monsterDesc, currentHealth) {
	return {
		monster_id: monsterImageId,
		monster_name: monsterName,
		monster_description: monsterDesc,
		level: delve.level,
		health: currentHealth,
		start_health: getMonsterStatsStartHealth() || currentHealth,
		life_regen: delve.life_regen,
		damage_reduction: delve.damage_reduction,
		monster_speed: delve.monster_speed,
		item_quantity: delve.item_quantity,
		item_rarity: delve.item_rarity,
		roll_attempt: delve.roll_attempt,
		status: delve.status,
		modifiers: Array.isArray(delve.modifiers) ? delve.modifiers : [],
	};
}

function initMonsterStatsSheet() {
	const sheet = document.getElementById('monsterStatsSheet');
	if (!sheet) return;

	sheet.querySelectorAll('[data-close-stats]').forEach((el) => {
		el.addEventListener('click', closeMonsterStatsSheet);
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && isMonsterStatsOpen) closeMonsterStatsSheet();
	});
}

window.registerMonsterStatsEnemies = registerMonsterStatsEnemies;
window.openMonsterStatsForEnemy = openMonsterStatsForEnemy;
window.buildMonsterStatsSnapshotFromEnemy = buildMonsterStatsSnapshotFromEnemy;

document.addEventListener('DOMContentLoaded', initMonsterStatsSheet);
