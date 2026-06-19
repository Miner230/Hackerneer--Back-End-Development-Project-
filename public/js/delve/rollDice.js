const diceCube = document.getElementById('diceCube');

const combatLog = document.getElementById('delveCombatLog');

const rollBtn = document.querySelector('.dice-roll-btn.roll');

const diceDock = document.querySelector('.dice-dock');

const turnIndicator = document.getElementById('turnIndicator');

const combatLogSidebar = document.getElementById('delveCombatSidebar');

const toggleCombatLogBtn = document.getElementById('toggleCombatLogBtn');



const ROLL_PAUSE_MS = 400;
const FAST_ROLL_COUNT_THRESHOLD = 10;
const FAST_ROLL_SPEED_MULTIPLIER = 2;

const ROLL_DURATION_MS = DiceRollAnimator.ROLL_DURATION_MS;

const ENEMY_TURN_COOLDOWN_MS = 1000;
const LOOT_DROP_STAGGER_MS = 100;
const LOOT_BURST_ANIM_MS = 520;
const END_OVERLAY_BASE_DELAY_MS = 1800;
const LOOT_ITEM_IMG_BASE =
	'https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/items/L';



let isRolling = false;
let isCombatBusy = false;

let diceRollState = DiceRollAnimator.getInitialState();
let currentRotation = DiceRollAnimator.getFaceRotation(1);



function clearCombatLog() {

	if (!combatLog) return;

	combatLog.innerHTML = '';
	clearMonsterLootDrops();
}



function isCombatLogOpen() {
	return combatLogSidebar?.classList.contains('is-open') ?? false;
}

function scheduleCombatLogPeek(entry) {
	entry.classList.add('combat-log-entry--peek');

	entry.addEventListener(
		'animationend',
		(event) => {
			if (event.animationName !== 'combatLogPeekReveal') return;
			if (!entry.isConnected || isCombatLogOpen()) return;
			entry.classList.remove('combat-log-entry--peek');
		},
		{ once: true }
	);
}

function normalizeRarityKey(rarity) {
	const key = (rarity || 'common').toLowerCase();
	const tiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
	return tiers.includes(key) ? key : 'common';
}

function appendLootDropLog(message, rarity) {
	appendCombatLog(message, `loot-${normalizeRarityKey(rarity)}`);
}

function flattenLootDrops(items) {
	const drops = [];

	(items || []).forEach((item) => {
		const count = Math.max(1, Number(item.quantity) || 1);
		for (let i = 0; i < count; i++) {
			drops.push(item);
		}
	});

	return drops;
}

function clearMonsterLootDrops() {
	const layer = document.getElementById('monsterLootLayer');
	if (layer) layer.innerHTML = '';
}

function getLootDropMotionScale() {
	const battlefield = document.querySelector('.delve-battlefield');
	if (!battlefield) return 1;

	const scale = parseFloat(getComputedStyle(battlefield).getPropertyValue('--loot-drop-motion-scale'));
	return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function spawnMonsterLootDrop(item, index, total) {
	const layer = document.getElementById('monsterLootLayer');
	if (!layer || !item?.id) return;

	const motionScale = getLootDropMotionScale();
	const rarityKey = normalizeRarityKey(item.rarity);
	const drop = document.createElement('div');
	drop.className = `monster-loot-drop monster-loot-drop--${rarityKey}`;

	const img = document.createElement('img');
	img.src = item.image_key
		? `/assets/dice/${item.image_key}.png`
		: typeof getLootImageSrc === 'function'
			? getLootImageSrc(item.id)
			: `${LOOT_ITEM_IMG_BASE}${item.id}.png`;
	img.alt = item.name || 'Loot';
	img.className = 'monster-loot-drop-img';
	img.loading = 'eager';
	drop.appendChild(img);

	const angle = Math.random() * Math.PI * 2;
	const horizontalReach = (36 + Math.random() * 62) * motionScale;
	const apexLift = -(52 + Math.random() * 38) * motionScale;
	const indexSpread = (index - (total - 1) / 2) * Math.min(22 * motionScale, (200 * motionScale) / Math.max(total, 1));
	const landX = Math.cos(angle) * horizontalReach + indexSpread + (Math.random() * 12 - 6) * motionScale;
	const landY = (38 + Math.random() * 22) * motionScale;
	const apexX = Math.cos(angle) * (horizontalReach * 0.48) + indexSpread * 0.35;
	const apexY = apexLift;
	const spin = Math.random() * 50 - 25;

	drop.style.setProperty('--apex-x', `${apexX.toFixed(1)}px`);
	drop.style.setProperty('--apex-y', `${apexY.toFixed(1)}px`);
	drop.style.setProperty('--land-x', `${landX.toFixed(1)}px`);
	drop.style.setProperty('--land-y', `${landY.toFixed(1)}px`);
	drop.style.setProperty('--spin-deg', `${spin.toFixed(1)}deg`);
	drop.style.left = '50%';
	drop.style.top = '40%';

	layer.appendChild(drop);
}

function logLootDrops(items) {
	const drops = flattenLootDrops(items);

	if (!drops.length) {
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		drops.forEach((item, index) => {
			window.setTimeout(() => {
				appendLootDropLog(`Dropped: ${item.name} (${item.rarity})`, item.rarity);
				spawnMonsterLootDrop(item, index, drops.length);

				if (index === drops.length - 1) {
					window.setTimeout(resolve, LOOT_BURST_ANIM_MS);
				}
			}, index * LOOT_DROP_STAGGER_MS);
		});
	});
}

function appendCombatLog(message, type = 'system') {
	if (!combatLog || !message) return;

	const entry = document.createElement('div');
	entry.className = `combat-log-entry combat-log-${type}`;
	entry.textContent = message;
	combatLog.appendChild(entry);
	combatLog.scrollTop = combatLog.scrollHeight;

	if (!isCombatLogOpen()) {
		scheduleCombatLogPeek(entry);
	}
}



function getCombatInstance(data) {

	return data?.currentInstance || data;

}



function getPlayerHealthBeforeMonsterTurn(stats, monsterTurn) {
	if (!monsterTurn?.attacks?.length || !stats) {
		return stats?.player_health ?? stats?.player_max_health ?? 0;
	}

	const maxHp = stats.player_max_health ?? 100;
	const restored = (stats.player_health ?? 0) + (monsterTurn.totalDamage ?? 0);
	return Math.min(maxHp, restored);
}

function getStatsForPlayerAttackPhase(stats, monsterTurn) {
	if (!monsterTurn?.attacks?.length || !stats) return stats;

	return {
		...stats,
		player_health: getPlayerHealthBeforeMonsterTurn(stats, monsterTurn),
		attacks_remaining: 0,
	};
}

function getStatsForMonsterAttackPhase(stats, playerHealth) {
	return {
		...stats,
		player_health: playerHealth,
		attacks_remaining: 0,
		active_turn: 'monster',
	};
}

function stripDuplicateRollDetails(summary) {
	if (!summary) return summary;

	return summary
		.replace(/\s*— Duplicated \d+ (time|times)[^!]*(!)?/gi, '')
		.replace(/\s*\(Dice rolls:[^)]*\)/gi, '')
		.trim();
}

function isGenericTurnMessage(message) {
	if (!message) return true;
	return /^(keep going!?|continue!?|your turn\.?)$/i.test(message.trim());
}

function logPlayerAttackOutcome(data) {
	const instance = getCombatInstance(data);
	const raw = instance?.raw || data?.raw;
	let rolledSummary = instance?.rolled || data?.rolled;

	if (rolledSummary) {
		rolledSummary = stripDuplicateRollDetails(rolledSummary);
		appendCombatLog(rolledSummary, raw?.isCrit ? 'crit' : 'roll');
	}

	const damageDealt = raw?.playerDamageToMonster;
	const rolledDamage = raw?.rollResult;
	if (
		damageDealt !== undefined &&
		damageDealt !== null &&
		rolledDamage !== undefined &&
		rolledDamage !== damageDealt
	) {
		appendCombatLog(`${damageDealt} damage applied (${rolledDamage} before DR/regen).`, 'damage');
	}
}

function logMonsterTurnOutcome(monsterTurn, monsterAttack) {
	if (monsterAttack) {
		appendCombatLog(monsterAttack, 'player-damage');
		return;
	}

	if (!monsterTurn?.attacks?.length) return;

	const totalDamage = monsterTurn.totalDamage ?? monsterTurn.attacks.reduce(
		(sum, attack) => sum + (attack.damageDealt ?? 0),
		0
	);

	if (totalDamage > 0) {
		appendCombatLog(`You took ${totalDamage} damage.`, 'player-damage');
	}
}

function logTurnSummary(data) {
	const instance = getCombatInstance(data);
	const resultMsg = instance?.message || data?.message || '';
	const rewards = instance?.rewards || data?.rewards;

	if (resultMsg && !isGenericTurnMessage(resultMsg)) {
		const lower = resultMsg.toLowerCase();
		if (lower.includes('success')) {
			appendCombatLog(resultMsg, 'success');
		} else if (lower.includes('slain')) {
			appendCombatLog(resultMsg, 'fail');
		} else {
			appendCombatLog(resultMsg, 'info');
		}
	}

	if (rewards?.type === 'loot_drop' && rewards.items?.length) {
		logLootDrops(rewards.items);
	}

	const xp = instance?.xp;
	if (xp?.gained) {
		let xpMsg = `+${xp.gained} XP`;
		if (xp.levelsGained > 0) {
			xpMsg += ` — Level up${xp.levelsGained > 1 ? ` ×${xp.levelsGained}` : ''}!`;
		}
		appendCombatLog(xpMsg, 'success');
	}

	return Promise.resolve();
}

function logRollOutcome(data) {
	logPlayerAttackOutcome(data);

	const instance = getCombatInstance(data);
	logMonsterTurnOutcome(instance?.monsterTurn || data?.monsterTurn, instance?.monsterAttack || data?.monsterAttack);

	const playerRegen = instance?.playerRegen || data?.playerRegen;
	if (playerRegen) appendCombatLog(playerRegen, 'info');

	logTurnSummary(data);
}



function lockDice() {
	isCombatBusy = true;
	if (rollBtn) {
		rollBtn.disabled = true;
		rollBtn.classList.add('disabled', 'rolling');
	}
}

function unlockDice(stats) {
	isCombatBusy = false;
	if (rollBtn) {
		rollBtn.classList.remove('rolling');
	}
	updateTurnUI(stats);
}

function setTurnIndicator(text, phase = 'player') {
	if (!turnIndicator) return;

	turnIndicator.textContent = text;
	turnIndicator.classList.remove(
		'turn-indicator--player',
		'turn-indicator--enemy',
		'turn-indicator--waiting',
		'turn-indicator--ended'
	);
	turnIndicator.classList.add(`turn-indicator--${phase}`);
}

function updateTurnUI(stats) {

	if (!stats) return;



	const canRoll =

		stats.status !== 'completed' &&

		stats.active_turn === 'player' &&

		(stats.attacks_remaining ?? 0) > 0;



	if (stats.status === 'completed') {
		setTurnIndicator('Battle ended', 'ended');
	} else if (stats.active_turn === 'player') {
		setTurnIndicator(`Your turn — ${stats.attacks_remaining}/${stats.player_speed} attacks`, 'player');
	} else {
		setTurnIndicator(`Monster turn — SPD ${stats.monster_speed}`, 'enemy');
	}



	if (diceDock) {

		diceDock.classList.toggle('dice-dock--enemy-turn', stats.active_turn === 'monster');

	}



	if (rollBtn) {
		rollBtn.disabled = !canRoll || isRolling || isCombatBusy;
		rollBtn.classList.toggle('disabled', !canRoll || isRolling || isCombatBusy);
		rollBtn.classList.toggle('rolling', isRolling || isCombatBusy);
	}

}



function delay(ms) {

	return new Promise((resolve) => setTimeout(resolve, ms));

}



function setCubeRotation(x, y, animate = false) {
	currentRotation = { x, y };
	DiceRollAnimator.applyRotation(diceCube, x, y, animate);
}

function showFace(face, animate = false) {
	const target = DiceRollAnimator.getFaceRotation(face);
	setCubeRotation(target.x, target.y, animate);
}

async function rollSingleDie(face, speedMultiplier = 1) {
	const result = await DiceRollAnimator.rollToFace(diceCube, face, diceRollState, {
		speedMultiplier,
	});
	diceRollState = result.state;
	currentRotation = { x: result.x, y: result.y };
}

function getRollAnimationSpeedMultiplier(rollCount) {
	return rollCount >= FAST_ROLL_COUNT_THRESHOLD ? FAST_ROLL_SPEED_MULTIPLIER : 1;
}



document.addEventListener('DOMContentLoaded', () => {

	sessionStorage.removeItem('delveID');

	showFace(1);

	attachEventListeners();

});



function setCombatLogOpen(isOpen) {
	if (!combatLogSidebar) return;

	combatLogSidebar.classList.toggle('is-open', isOpen);
	combatLogSidebar.classList.toggle('is-collapsed', !isOpen);

	if (toggleCombatLogBtn) {
		toggleCombatLogBtn.setAttribute('aria-expanded', String(isOpen));
		toggleCombatLogBtn.textContent = isOpen ? 'Hide Log' : 'Log';
	}

	if (combatLog) {
		combatLog.querySelectorAll('.combat-log-entry').forEach((entry) => {
			entry.classList.remove('combat-log-entry--peek');
		});
	}
}

function attachEventListeners() {
	if (rollBtn) rollBtn.addEventListener('click', triggerDelveAction);

	if (toggleCombatLogBtn) {
		toggleCombatLogBtn.addEventListener('click', () => {
			const isOpen = combatLogSidebar?.classList.contains('is-open');
			setCombatLogOpen(!isOpen);
		});
	}
}



function splitDamageAcrossRolls(baseRolls, totalDamage) {
	if (!Array.isArray(baseRolls) || baseRolls.length === 0) return [];

	const total = Math.max(0, Number(totalDamage) || 0);
	if (baseRolls.length === 1) return [total];

	const rollSum = baseRolls.reduce((sum, value) => sum + Number(value), 0);
	if (rollSum <= 0) {
		const even = Math.floor(total / baseRolls.length);
		return baseRolls.map((_, index) =>
			index === baseRolls.length - 1 ? total - even * (baseRolls.length - 1) : even
		);
	}

	let allocated = 0;
	return baseRolls.map((value, index) => {
		if (index === baseRolls.length - 1) {
			return Math.max(0, total - allocated);
		}

		const portion = Math.floor((Number(value) / rollSum) * total);
		allocated += portion;
		return portion;
	});
}

function resolveRollCrit(attackEffects, rollIndex) {
	if (!attackEffects) return false;

	if (Array.isArray(attackEffects.critPerRoll)) {
		return Boolean(attackEffects.critPerRoll[rollIndex]);
	}

	return Boolean(attackEffects.isCrit);
}

async function animateDiceRollSequence(rolls = [], options = {}) {
	const {
		enableRollAfter = true,
		showPrompt = false,
		rollDamages = null,
		damageTarget = null,
		startingMonsterHealth = null,
		startingPlayerHealth = null,
		playerMaxHealth = null,
		attackEffects = null,
	} = options;



	if (isRolling) return;



	rollBtn.disabled = true;

	rollBtn.classList.add('disabled', 'rolling');



	if (!Array.isArray(rolls) || rolls.length === 0) {

		showFace(1);

		if (showPrompt) {

			appendCombatLog('Tap the dice to attack.', 'system');

		}

		if (enableRollAfter && !isCombatBusy) {
			rollBtn.disabled = false;
			rollBtn.classList.remove('disabled', 'rolling');
		}

		return;

	}



	isRolling = true;



	try {

		let runningMonsterHealth = startingMonsterHealth;
		let runningPlayerHealth = startingPlayerHealth;
		const speedMultiplier = getRollAnimationSpeedMultiplier(rolls.length);
		const rollPauseMs = ROLL_PAUSE_MS / speedMultiplier;

		for (let i = 0; i < rolls.length; i++) {

			const face = Math.min(6, Math.max(1, Number(rolls[i]) || 1));

			await rollSingleDie(face, speedMultiplier);

			const rollDamage = Array.isArray(rollDamages) ? rollDamages[i] : 0;
			const isRollCrit = resolveRollCrit(attackEffects, i);
			const isDuplicateRoll = i > 0;

			if (rollDamage > 0 && damageTarget) {
				const monsterHpBeforeHit =
					damageTarget === 'monster' &&
					runningMonsterHealth !== null &&
					runningMonsterHealth !== undefined
						? runningMonsterHealth
						: null;
				const canShowHitEffects =
					damageTarget === 'player' ? true : monsterHpBeforeHit > 0;

				showDamage(rollDamage, damageTarget, { isCrit: isRollCrit });

				if (damageTarget === 'monster' && monsterHpBeforeHit !== null) {
					runningMonsterHealth -= rollDamage;
					updateMonsterHealthUI(runningMonsterHealth);
				}

				if (
					damageTarget === 'player' &&
					runningPlayerHealth !== null &&
					runningPlayerHealth !== undefined
				) {
					runningPlayerHealth = Math.max(0, runningPlayerHealth - rollDamage);
					updatePlayerHealthUI(runningPlayerHealth, playerMaxHealth);
				}

				if (attackEffects && canShowHitEffects) {
					if (isRollCrit) {
						showCritEffect();
					}
					if (isDuplicateRoll) {
						showDuplicateEffect();
					}
				}
			} else if (attackEffects && isRollCrit) {
				showCritEffect();
				if (isDuplicateRoll) {
					showDuplicateEffect();
				}
			}

			if (i < rolls.length - 1) await delay(rollPauseMs);

		}

		return { runningMonsterHealth, runningPlayerHealth };

	} finally {
		isRolling = false;
		if (!isCombatBusy) {
			rollBtn.classList.remove('rolling');
		}
	}

	if (enableRollAfter && !isCombatBusy) {
		rollBtn.disabled = false;
		rollBtn.classList.remove('disabled');
	}
}



async function animateMonsterTurn(monsterTurn, stats, startingPlayerHealth) {
	if (!monsterTurn?.attacks?.length) return;

	lockDice();

	if (diceDock) diceDock.classList.add('dice-dock--enemy-turn');
	setTurnIndicator('Monster attacks...', 'enemy');

	let runningPlayerHealth = startingPlayerHealth;

	for (const attack of monsterTurn.attacks) {
		const rollDamages = splitDamageAcrossRolls(attack.baseRolls, attack.damageDealt);

		const rollResult = await animateDiceRollSequence(attack.baseRolls || [], {
			enableRollAfter: false,
			rollDamages,
			damageTarget: 'player',
			startingPlayerHealth: runningPlayerHealth,
			playerMaxHealth: stats?.player_max_health,
			attackEffects: {
				critPerRoll: attack.critPerRoll,
				isCrit: Boolean(attack.isCrit),
			},
		});

		if (rollResult?.runningPlayerHealth !== null && rollResult?.runningPlayerHealth !== undefined) {
			runningPlayerHealth = rollResult.runningPlayerHealth;
		} else {
			runningPlayerHealth = Math.max(0, runningPlayerHealth - (attack.damageDealt ?? 0));
		}

		if (stats) {
			updatePlayerUI(getStatsForMonsterAttackPhase(stats, runningPlayerHealth));
		}
		setTurnIndicator('Monster attacks...', 'enemy');

		await delay(350);
	}

	if (diceDock) diceDock.classList.remove('dice-dock--enemy-turn');
}



function handleDelveActionResponse(status, data) {

	const instance = getCombatInstance(data);

	const raw = instance?.raw || data?.raw;



	if (status !== 200 || !raw?.baseRolls) {
		appendCombatLog('Failed to load or parse dice data.', 'fail');
		unlockDice();
		return;
	}



	const rolls = raw.baseRolls;

	const resultMsg = instance?.message || data?.message || '';

	const monsterTurn = instance?.monsterTurn || data?.monsterTurn;
	const monsterAttack = instance?.monsterAttack || data?.monsterAttack;
	const stats = instance?.stats || data?.stats;
	const playerHealthBeforeMonster = getPlayerHealthBeforeMonsterTurn(stats, monsterTurn);

	(async () => {
		try {
			const monsterHealthBefore = resolveMonsterHealthBeforeAttack(stats, raw);
			const postHealth = Math.max(0, stats?.health ?? 0);
			const totalMonsterDamage = Math.max(0, monsterHealthBefore - postHealth);
			const rollDamages = splitDamageAcrossRolls(rolls, totalMonsterDamage);

			await animateDiceRollSequence(rolls, {
				enableRollAfter: false,
				rollDamages,
				damageTarget: 'monster',
				startingMonsterHealth: monsterHealthBefore,
				attackEffects: {
					critPerRoll: raw?.critPerRoll,
					isCrit: Boolean(raw?.isCrit),
				},
			});

			if (stats?.health !== undefined) {
				updateMonsterHealthUI(stats.health);
			}

			const playerPhaseStats = getStatsForPlayerAttackPhase(stats, monsterTurn);
			if (playerPhaseStats) {
				updatePlayerUI(playerPhaseStats);
			}

			logPlayerAttackOutcome(data);

			if (monsterTurn?.attacks?.length) {
				setTurnIndicator("Monster's turn incoming...", 'waiting');
				await delay(ENEMY_TURN_COOLDOWN_MS);
				await animateMonsterTurn(monsterTurn, stats, playerHealthBeforeMonster);
				logMonsterTurnOutcome(monsterTurn, monsterAttack);
			}

			if (stats) {
				updatePlayerUI(stats);
				if (typeof syncMonsterStatsFromDelve === 'function') {
					syncMonsterStatsFromDelve(stats);
				}
			}

			const lootDropWait = logTurnSummary(data);

			if (stats?.status === 'completed') {
				if (resultMsg.toLowerCase().includes('success')) {
					playMonsterDeathAnimation();
				}

				await Promise.all([lootDropWait, delay(END_OVERLAY_BASE_DELAY_MS)]);

				const overlay = document.getElementById('delveEndOverlay');
				let outcome = 'default';

				if (resultMsg.toLowerCase().includes('success')) outcome = 'win';
				else if (resultMsg.toLowerCase().includes('slain')) outcome = 'lose';

				setNextDelveButtonText(outcome);

				if (overlay) overlay.classList.remove('d-none');

				if (rollBtn) {
					rollBtn.disabled = true;
					rollBtn.classList.add('disabled');
				}
			}
		} finally {
			if (stats?.status !== 'completed') {
				unlockDice(stats);
			} else {
				isCombatBusy = false;
				if (rollBtn) rollBtn.classList.remove('rolling');
			}
		}

		loadDelveInfo();
	})();

}



function triggerDelveAction() {
	if (isRolling || isCombatBusy) return;

	const delveId = sessionStorage.getItem('delveID');

	if (!token || !delveId) {
		appendCombatLog('Missing token or delve ID. Start a new delve.', 'fail');
		return;
	}

	lockDice();
	fetchMethod(`${currentUrl}/api/delve/${delveId}/action`, handleDelveActionResponse, 'PUT', null, token);
}



function showDamage(damageAmount, target = 'monster', options = {}) {
	const { isCrit = false } = options;

	if (target === 'player') {

		const container = document.getElementById('playerDisplay');

		const playerImg = document.getElementById('playerImage');

		if (!container || !playerImg) return;



		playerImg.classList.remove('player-hit');

		void playerImg.offsetWidth;

		playerImg.classList.add('player-hit');



		const damage = document.createElement('div');

		damage.className = isCrit
			? 'damage-float player-damage-float damage-float--crit'
			: 'damage-float player-damage-float';

		damage.textContent = `-${damageAmount}`;



		const rect = playerImg.getBoundingClientRect();

		const offsetX = Math.random() * Math.max(20, rect.width - 40);

		const offsetY = Math.random() * Math.max(20, rect.height - 40);



		damage.style.left = `${offsetX}px`;

		damage.style.top = `${offsetY}px`;

		container.appendChild(damage);

		setTimeout(() => {

			damage.remove();

			playerImg.classList.remove('player-hit');

		}, 3000);

		return;

	}



	const container = document.querySelector('#primaryMonster .monster-display');

	const monsterImg = document.getElementById('monsterImage');

	if (!container || !monsterImg) return;



	const damage = document.createElement('div');

	damage.className = isCrit ? 'damage-float damage-float--crit' : 'damage-float';

	damage.textContent = `-${damageAmount}`;



	const rect = monsterImg.getBoundingClientRect();

	const offsetX = Math.random() * Math.max(20, rect.width - 40);

	const offsetY = Math.random() * Math.max(20, rect.height - 40);



	damage.style.left = `${offsetX}px`;

	damage.style.top = `${offsetY}px`;



	container.appendChild(damage);

	setTimeout(() => damage.remove(), 3000);

}



function setNextDelveButtonText(outcome) {

	const messageEl = document.getElementById('delveEndMessage');

	const nextBtn = document.getElementById('startNextDelveBtn');

	if (!messageEl) return;



	if (outcome === 'win') {

		messageEl.textContent = 'Victory! Continue to Next Delve';

		if (nextBtn) nextBtn.textContent = 'Start Next Delve';

	} else if (outcome === 'lose') {

		messageEl.textContent = 'Defeated... Try Again?';

		if (nextBtn) nextBtn.textContent = 'Try Again';

	} else {

		messageEl.textContent = 'Delve Complete';

		if (nextBtn) nextBtn.textContent = 'Start Next Delve';

	}

}



function showCritEffect() {
	const container = document.querySelector('.dice-dock');
	if (!container) return;

	const crit = document.createElement('div');
	crit.className = 'crit-float';
	crit.textContent = 'CRITICAL! ☠︎︎';
	container.appendChild(crit);
	setTimeout(() => crit.remove(), 2500);
}

function showDuplicateEffect() {
	const container = document.querySelector('.dice-dock');
	if (!container) return;

	const duplicate = document.createElement('div');
	duplicate.className = 'dup-float';
	duplicate.textContent = 'DUPLICATE! ✵';
	container.appendChild(duplicate);
	setTimeout(() => duplicate.remove(), 2500);
}

function playMonsterDeathAnimation() {

	const monsterImg = document.getElementById('monsterImage');

	if (monsterImg) monsterImg.classList.add('monster-death');

}


