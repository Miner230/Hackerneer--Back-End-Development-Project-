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

	//bind delve start buttons
	const createDelveBtn = document.getElementById('createDelve');
	const startNextDelveBtn = document.getElementById('startNextDelveBtn');
	if (createDelveBtn) createDelveBtn.addEventListener('click', startDelve);
	if (startNextDelveBtn) startNextDelveBtn.addEventListener('click', startDelve);
});

//load delve info and render ui
function loadDelveInfo() {
	const delveDiv = document.getElementById('delveInfo');
	const storedDelveId = sessionStorage.getItem('delveID');

	const callback = (status, data) => {
		let delve = null;
		let monsterImageId = null;
		let monsterName = null;
		let monsterDesc = null;

		//extract roll value for damage
		const rawData = data?.currentInstance?.raw || data?.raw;
		const rollValue = rawData && typeof rawData.rollValue === 'number' ? rawData.rollValue : null;
		if (rollValue !== null) {
			sessionStorage.setItem('lastRollValue', rollValue);
			showDamage(rollValue);
		}

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
		if (nameEl) nameEl.textContent = monsterName;
		if (descEl) descEl.textContent = monsterDesc;

		//update health bar
		const currentHealth = delve.health || 0;
		const maxHealth = parseInt(sessionStorage.getItem('maxHealth')) || 100;
		let percent = Math.floor((currentHealth / maxHealth) * 100);
		percent = Math.min(100, Math.max(0, percent));

		const healthFill = document.getElementById('health-fill');
		const healthLabel = document.getElementById('health-label');
		if (healthFill) {
			healthFill.style.width = `${percent}%`;
			healthFill.style.opacity = percent === 0 ? '0' : '1';
		}
		if (healthLabel) healthLabel.textContent = `HP: ${percent}%`;

		//update labels
		const levelLabel = document.getElementById('monsterLevel');
		const hpLabel = document.getElementById('monsterCurrentHP');
		if (levelLabel) levelLabel.textContent = `Lv. ${delve.level || '?'}`;
		if (hpLabel) hpLabel.textContent = `HP: ${currentHealth} / ${maxHealth}`;

		//update stats and modifiers
		const statsEl = document.getElementById('delveStats');
		if (statsEl) {
			const mods = Array.isArray(delve.modifiers)
				? delve.modifiers.map((mod) => `${mod.name}: ${mod.description}`).join('<br>')
				: 'No modifier info';
			statsEl.innerHTML = `
        <h1 class="text-warning mb-3">Monster Stats</h1>
        <p><span class="text-danger">Life Regen:</span> <span class="text-white">${delve.life_regen}</span></p>
        <p><span class="text-info">Damage Reduction:</span> <span class="text-white">${delve.damage_reduction}</span></p>
        <p><span class="text-primary">Roll Attempts:</span> <span class="text-white">${delve.roll_attempt}</span></p>
        <p><span class="rainbow-text">Loot Shards:</span> <span class="text-white">${delve.loot_shard_count}</span></p>
        <p><span class="text-success">Status:</span> <span class="text-white">${delve.status}</span></p>
        <div class="mt-3">
          <span class="text-warning">Modifiers:</span><br />
          <span class="text-light small">${mods}</span>
        </div>`;
		}
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
		document.getElementById('startNextDelveBtn')?.classList.add('d-none');
		const mainContent = document.getElementById('mainContent');
		if (mainContent) mainContent.classList.remove('d-none');

		//reset session data
		sessionStorage.removeItem('delveID');
		sessionStorage.removeItem('maxHealth');

		//enable dice roll
		const rollBtn = document.querySelector('.roll');
		if (rollBtn) {
			rollBtn.disabled = false;
			rollBtn.classList.remove('disabled');
		}

		//trigger animations and data load
		animateDiceRollSequence();
		loadDelveInfo();
	});
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
