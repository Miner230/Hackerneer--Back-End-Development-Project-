const diceCube = document.getElementById('diceCube');

const combatLog = document.getElementById('delveCombatLog');

const rollBtn = document.querySelector('.dice-roll-btn.roll');

const diceDock = document.querySelector('.dice-dock');

const turnIndicator = document.getElementById('turnIndicator');



const IDLE_TILT = { x: -18, y: 22 };



const FACE_OFFSET = {

	1: { x: 0, y: 0 },

	2: { x: -90, y: 0 },

	3: { x: 0, y: -90 },

	4: { x: 0, y: 90 },

	5: { x: 90, y: 0 },

	6: { x: 0, y: 180 },

};



const MIN_SPIN_DEG = 720;

const ROLL_PAUSE_MS = 400;

const ROLL_DURATION_MS = 1000;

const ENEMY_TURN_COOLDOWN_MS = 1000;



let isRolling = false;
let isCombatBusy = false;

let currentRotation = { ...IDLE_TILT };



function getFaceRotation(face) {

	const offset = FACE_OFFSET[face] || FACE_OFFSET[1];

	return {

		x: IDLE_TILT.x + offset.x,

		y: IDLE_TILT.y + offset.y,

	};

}



function clearCombatLog() {

	if (!combatLog) return;

	combatLog.innerHTML = '';

}



function appendCombatLog(message, type = 'system') {

	if (!combatLog || !message) return;



	const entry = document.createElement('div');

	entry.className = `combat-log-entry combat-log-${type}`;

	entry.textContent = message;

	combatLog.appendChild(entry);

	combatLog.scrollTop = combatLog.scrollHeight;

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

function logPlayerAttackOutcome(data) {
	const instance = getCombatInstance(data);
	const raw = instance?.raw || data?.raw;
	const rolledSummary = instance?.rolled || data?.rolled;

	if (rolledSummary) {
		appendCombatLog(rolledSummary, raw?.isCrit ? 'crit' : 'roll');
	}

	if (raw?.rollResult) {
		appendCombatLog(`You dealt ${raw.rollResult} damage to the monster.`, 'damage');
	}
}

function logMonsterTurnOutcome(monsterTurn, monsterAttack) {
	if (monsterAttack) {
		appendCombatLog(monsterAttack, 'player-damage');
	}

	if (!monsterTurn?.attacks?.length) return;

	monsterTurn.attacks.forEach((attack, index) => {
		if (attack.description) {
			appendCombatLog(`Attack ${index + 1}: ${attack.description}`, 'player-damage');
		}
		if (attack.damageDealt) {
			appendCombatLog(`You took ${attack.damageDealt} damage.`, 'player-damage');
		}
	});
}

function logTurnSummary(data) {
	const instance = getCombatInstance(data);
	const stats = instance?.stats || data?.stats;
	const resultMsg = instance?.message || data?.message || '';
	const rewards = instance?.rewards || data?.rewards;

	if (resultMsg) {
		const lower = resultMsg.toLowerCase();
		if (lower.includes('success')) {
			appendCombatLog(resultMsg, 'success');
		} else if (lower.includes('slain')) {
			appendCombatLog(resultMsg, 'fail');
		} else {
			appendCombatLog(resultMsg, 'info');
		}
	}

	if (stats) {
		appendCombatLog(
			`You: ${stats.player_health}/${stats.player_max_health} HP · Monster: ${stats.health} HP · Attacks left: ${stats.attacks_remaining}/${stats.player_speed}`,
			'info'
		);

		if (stats.loot_shard_count > 0 && stats.status === 'completed' && resultMsg.toLowerCase().includes('success')) {
			appendCombatLog(`Loot available: ${stats.loot_shard_count} shard(s) on this kill.`, 'loot');
		}
	}

	if (rewards?.type === 'loot_shard' && rewards.amount) {
		appendCombatLog(`+${rewards.amount} loot shard added to your rewards!`, 'loot');
	}
}

function logRollOutcome(data) {
	logPlayerAttackOutcome(data);

	const instance = getCombatInstance(data);
	logMonsterTurnOutcome(instance?.monsterTurn || data?.monsterTurn, instance?.monsterAttack || data?.monsterAttack);
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



function normalizeAngle(deg) {

	return ((deg % 360) + 360) % 360;

}



function computeEndAngle(current, target, minSpin) {

	const targetNorm = normalizeAngle(target);

	let end = current + minSpin;

	const remainder = (targetNorm - normalizeAngle(end) + 360) % 360;

	end += remainder;



	if (end < current + minSpin) {

		end += 360;

	}



	return end;

}



function setCubeRotation(x, y, animate = false) {

	currentRotation = { x, y };

	diceCube.classList.toggle('is-rolling', animate);

	diceCube.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;

}



function showFace(face, animate = false) {

	const target = getFaceRotation(face);

	setCubeRotation(target.x, target.y, animate);

}



function rollSingleDie(face) {

	const target = getFaceRotation(face);

	const endX = computeEndAngle(currentRotation.x, target.x, MIN_SPIN_DEG);

	const endY = computeEndAngle(currentRotation.y, target.y, MIN_SPIN_DEG);



	return new Promise((resolve) => {

		const onEnd = (event) => {

			if (event.propertyName !== 'transform') return;

			diceCube.removeEventListener('transitionend', onEnd);

			diceCube.classList.remove('is-rolling');

			currentRotation = { x: endX, y: endY };

			resolve();

		};



		diceCube.addEventListener('transitionend', onEnd);

		setCubeRotation(endX, endY, true);



		setTimeout(() => {

			diceCube.removeEventListener('transitionend', onEnd);

			diceCube.classList.remove('is-rolling');

			currentRotation = { x: endX, y: endY };

			diceCube.style.transform = `rotateX(${endX}deg) rotateY(${endY}deg)`;

			resolve();

		}, ROLL_DURATION_MS + 150);

	});

}



document.addEventListener('DOMContentLoaded', () => {

	sessionStorage.removeItem('delveID');

	showFace(1);

	attachEventListeners();

});



function attachEventListeners() {
	if (!rollBtn) return;
	rollBtn.addEventListener('click', triggerDelveAction);
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

async function animateDiceRollSequence(rolls = [], options = {}) {
	const {
		enableRollAfter = true,
		showPrompt = false,
		rollDamages = null,
		damageTarget = null,
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

		for (let i = 0; i < rolls.length; i++) {

			const face = Math.min(6, Math.max(1, Number(rolls[i]) || 1));

			await rollSingleDie(face);

			if (Array.isArray(rollDamages) && damageTarget && rollDamages[i] > 0) {
				showDamage(rollDamages[i], damageTarget);
			}

			if (i < rolls.length - 1) await delay(ROLL_PAUSE_MS);

		}

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

		await animateDiceRollSequence(attack.baseRolls || [], {
			enableRollAfter: false,
			rollDamages,
			damageTarget: 'player',
		});

		runningPlayerHealth = Math.max(0, runningPlayerHealth - (attack.damageDealt ?? 0));
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
			const rollDamages = splitDamageAcrossRolls(rolls, raw?.rollResult ?? 0);

			await animateDiceRollSequence(rolls, {
				enableRollAfter: false,
				rollDamages,
				damageTarget: 'monster',
			});

			if (stats?.health !== undefined) {
				updateMonsterHealthUI(stats.health);
			}

			const playerPhaseStats = getStatsForPlayerAttackPhase(stats, monsterTurn);
			if (playerPhaseStats) {
				updatePlayerUI(playerPhaseStats);
			}

			logPlayerAttackOutcome(data);

			showRollEffects({
				duplicationCount: raw.duplicationCount || 0,
				isCrit: raw.isCrit || false,
			});

			if (monsterTurn?.attacks?.length) {
				setTurnIndicator("Monster's turn incoming...", 'waiting');
				await delay(ENEMY_TURN_COOLDOWN_MS);
				await animateMonsterTurn(monsterTurn, stats, playerHealthBeforeMonster);
				logMonsterTurnOutcome(monsterTurn, monsterAttack);
			}

			if (stats) {
				updatePlayerUI(stats);
			}

			logTurnSummary(data);

			if (stats?.status === 'completed') {
				if (resultMsg.toLowerCase().includes('success')) {
					playMonsterDeathAnimation();
				}

				setTimeout(() => {
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
				}, 1800);
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



function showDamage(damageAmount, target = 'monster') {

	if (target === 'player') {

		const container = document.getElementById('playerDisplay');

		const playerImg = document.getElementById('playerImage');

		if (!container || !playerImg) return;



		playerImg.classList.remove('player-hit');

		void playerImg.offsetWidth;

		playerImg.classList.add('player-hit');



		const damage = document.createElement('div');

		damage.className = 'damage-float player-damage-float';

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

	damage.className = 'damage-float';

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



function playMonsterDeathAnimation() {

	const monsterImg = document.getElementById('monsterImage');

	if (monsterImg) monsterImg.classList.add('monster-death');

}



function showRollEffects({ duplicationCount = 0, isCrit = false }) {

	const container = document.querySelector('.dice-dock');

	if (!container) return;



	for (let i = 0; i < duplicationCount; i++) {

		setTimeout(() => {

			const duplicate = document.createElement('div');

			duplicate.className = 'dup-float';

			duplicate.textContent = 'DUPLICATE! ✵';

			container.appendChild(duplicate);

			appendCombatLog('Duplicate roll triggered!', 'crit');

			setTimeout(() => duplicate.remove(), 2500);

		}, i * 400);

	}



	if (isCrit) {

		const crit = document.createElement('div');

		crit.className = 'crit-float';

		crit.textContent = 'CRITICAL! ☠︎︎';

		container.appendChild(crit);

		appendCombatLog('Critical hit!', 'crit');

		setTimeout(() => crit.remove(), 3000);

	}

}


