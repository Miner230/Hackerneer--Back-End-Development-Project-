//dom element references
const dice = document.querySelector('.dice.roll');
const diceDiv = document.getElementById('diceResult');
const rollBtn = document.querySelector('.roll');
const startBtn = document.getElementById('startNextDelveBtn');
const startDelveBtn = document.getElementById('createDelve');

//remove delveID on page load and setup listeners
document.addEventListener('DOMContentLoaded', () => {
	sessionStorage.removeItem('delveID');
	attachEventListeners();
});

//attach event listeners
function attachEventListeners() {
	//start next delve button
	if (startBtn) {
		startBtn.addEventListener('click', () => {
			startBtn.classList.add('d-none');
			sessionStorage.removeItem('delveID');
			sessionStorage.removeItem('maxHealth');
			rollBtn.disabled = false;
			rollBtn.classList.remove('disabled');
			animateDiceRollSequence();
		});
	}

	//roll button
	rollBtn.addEventListener('click', triggerDelveAction);
}

//map dice face number to css rotation
function rollDiceToFace(number) {
	const rotations = {
		1: 'rotateX(0deg) rotateY(0deg)',
		2: 'rotateX(-90deg) rotateY(0deg)',
		3: 'rotateX(0deg) rotateY(-90deg)',
		4: 'rotateX(0deg) rotateY(90deg)',
		5: 'rotateX(90deg) rotateY(0deg)',
		6: 'rotateX(180deg) rotateY(0deg)',
	};
	dice.style.transform = rotations[number] || '';
}

//animate dice roll sequence
function animateDiceRollSequence(rolls = [], summaryText = '', outcomeMessage = '', onComplete = null) {
	const perRollDuration = 2800;
	const animationDuration = 1800;
	let delay = 0;
	rollBtn.disabled = true;
	rollBtn.classList.add('disabled');

	//show initial message if no rolls
	if (!Array.isArray(rolls) || rolls.length === 0) {
		diceDiv.innerHTML = `
      <div class="result-card p-4 text-center" style="min-height: 200px;">
        <h5 class="result-title">Roll Summary</h5>
        <p class="result-summary mb-2">Nothing has happened yet.</p>
        <p class="result-outcome">Click the dice to begin.</p>
      </div>`;
		rollBtn.disabled = false;
		rollBtn.classList.remove('disabled');
		return;
	}

	//run dice animations
	dice.style.animation = 'none';
	rolls.forEach((roll) => {
		setTimeout(() => {
			dice.style.animation = `rolling ${animationDuration}ms ease`;
			setTimeout(() => {
				rollDiceToFace(roll);
				dice.style.animation = 'none';
			}, animationDuration);
		}, delay);
		delay += perRollDuration;
	});

	//show results after rolling
	setTimeout(() => {
		diceDiv.innerHTML = `
      <div class="result-card p-4 text-center" style="min-height: 200px;">
        <h5 class="result-title">Roll Summary</h5>
        <p class="result-summary mb-2">${summaryText || 'No summary available.'}</p>
        <p class="result-outcome">${outcomeMessage || 'No outcome provided.'}</p>
      </div>`;

		const lastRollValue = parseInt(sessionStorage.getItem('lastRollValue'));
		if (!isNaN(lastRollValue)) {
			showDamage(lastRollValue);
			sessionStorage.removeItem('lastRollValue');
		}

		if (!outcomeMessage.toLowerCase().includes('success') && !outcomeMessage.toLowerCase().includes('boo')) {
			rollBtn.disabled = false;
			rollBtn.classList.remove('disabled');
		}

		if (typeof onComplete === 'function') onComplete();
	}, delay);
}

//handle delve action api response
function handleDelveActionResponse(status, data) {
	const raw = data?.raw || data?.currentInstance?.raw;
	if (status !== 200 || !raw?.baseRolls) {
		diceDiv.innerHTML = `<div class="text-danger text-center">Failed to load or parse dice data.</div>`;
		return;
	}

	const rolls = raw.baseRolls;
	const rolledSummary = data.rolled || data?.currentInstance?.rolled || 'No roll summary available.';
	const resultMsg = data.message || data?.currentInstance?.message || '';

	if (typeof raw.rollResult === 'number') {
		sessionStorage.setItem('lastRollValue', raw.rollResult);
	}

	animateDiceRollSequence(rolls, rolledSummary, resultMsg, () => {
		showRollEffects({
			duplicationCount: raw.duplicationCount || 0,
			isCrit: raw.isCrit || false,
		});

		const stats = data?.stats || data?.currentInstance?.stats;
		if (stats?.status === 'completed') {
			if (resultMsg.toLowerCase().includes('success')) {
				playMonsterDeathAnimation();
			}

			setTimeout(() => {
				const overlay = document.getElementById('delveStartOverlay');
				const nextBtn = document.getElementById('startNextDelveBtn');
				let outcome = 'default';
				if (resultMsg.toLowerCase().includes('success')) outcome = 'win';
				else if (resultMsg.toLowerCase().includes('boo')) outcome = 'lose';
				setNextDelveButtonText(outcome);

				if (overlay && nextBtn) {
					overlay.classList.remove('d-none');
					nextBtn.classList.remove('d-none');
				}

				rollBtn.disabled = true;
				rollBtn.classList.add('disabled');
			}, 1800);
		}

		loadDelveInfo();
	});
}

//trigger delve action
function triggerDelveAction() {
	const delveId = sessionStorage.getItem('delveID');
	if (!token || !delveId) {
		diceDiv.innerHTML = `<div class="text-danger text-center">Missing token, user ID, or delve ID.</div>`;
		return;
	}
	fetchMethod(`${currentUrl}/api/delve/${delveId}/action`, handleDelveActionResponse, 'PUT', null, token);
}

//floating damage number
function showDamage(damageAmount) {
	const container = document.querySelector('.monster-display');
	const monsterImg = document.getElementById('monsterImage');
	if (!container || !monsterImg) return;

	const damage = document.createElement('div');
	damage.className = 'damage-float';
	damage.textContent = `-${damageAmount}`;

	const rect = monsterImg.getBoundingClientRect();
	const offsetX = Math.random() * (rect.width - 40);
	const offsetY = Math.random() * (rect.height - 40);

	damage.style.left = `${offsetX}px`;
	damage.style.top = `${offsetY}px`;

	container.appendChild(damage);
	setTimeout(() => damage.remove(), 3000);
}

//set next delve button text
function setNextDelveButtonText(outcome) {
	const nextBtn = document.getElementById('statusMessage');
	if (!nextBtn) return;
	if (outcome === 'win') nextBtn.textContent = 'Victory! Continue to Next Delve';
	else if (outcome === 'lose') nextBtn.textContent = 'Defeated... Try Again?';
	else nextBtn.textContent = 'Start Next Delve';
}

//monster death animation
function playMonsterDeathAnimation() {
	const monsterImg = document.getElementById('monsterImage');
	if (monsterImg) monsterImg.classList.add('monster-death');
}

//show crit and duplicate roll effects
function showRollEffects({ duplicationCount = 0, isCrit = false }) {
	const container = document.querySelector('.dice-container');
	if (!container) return;

	for (let i = 0; i < duplicationCount; i++) {
		setTimeout(() => {
			const duplicate = document.createElement('div');
			duplicate.className = 'dup-float';
			duplicate.textContent = 'DUPLICATE! ✵';
			container.appendChild(duplicate);
			setTimeout(() => duplicate.remove(), 2500);
		}, i * 400);
	}

	if (isCrit) {
		const crit = document.createElement('div');
		crit.className = 'crit-float';
		crit.textContent = 'CRITICAL! ☠︎︎';
		container.appendChild(crit);
		setTimeout(() => crit.remove(), 3000);
	}
}
