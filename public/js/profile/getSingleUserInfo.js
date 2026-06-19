// Load user info and render profile card
function computePlayerMaxHealth(user) {
	const level = Math.max(1, Number(user?.level || 1));
	const baseMaxHealth = Math.floor(100 + level * 15);
	const flatHealth = Number(user?.player_flat_health || 0);
	const maxHealthPercent = Number(user?.player_max_health_percent || 0);

	return Math.floor((baseMaxHealth + flatHealth) * (1 + maxHealthPercent / 100));
}

function computePlayerSpeed(user) {
	const speedBonus = Number(user?.player_speed_bonus || 0);
	return Math.max(1, 1 + speedBonus);
}

function formatProfileStat(value) {
	return Math.round(Number(value) || 0).toLocaleString('en-US');
}

function loadUserInfo(data) {
	const userDiv = document.getElementById('userInfo');

	// Check if user data is available
	if (!Array.isArray(data.user_data) || data.user_data.length === 0) {
		userDiv.innerHTML = `<div class="text-danger text-center">No user data found.</div>`;
		return;
	}

	// Get user object
	const user = data.user_data[0];
	const totalHealth = computePlayerMaxHealth(user);
	const lifeRegen = Number(user.player_life_regen || 0);
	const playerSpeed = computePlayerSpeed(user);

	// Store username and level in localStorage
	localStorage.setItem('username', user.username);
	localStorage.setItem('level', user.level);

	// Update navbar label
	updateNavbarProfileLabel();

	// Render user info card
	userDiv.innerHTML = `
    <div class="card mb-4 p-3 profile-card text-light">
      <div class="row align-items-center g-3">
		<h4 class="text-center mb-3 rpg-heading">Player Stats</h4>
		<ul class="list-group list-group-flush bg-transparent stat-list">
		<li class="list-group-item d-flex justify-content-between">Username<span>${user.username}</span></li>
		<li class="list-group-item d-flex justify-content-between text-success">Level<span id="user-level">${user.level}</span></li>
		<li class="list-group-item d-flex justify-content-between text-info">Total Health ♥<span>${formatProfileStat(totalHealth)}</span></li>
		<li class="list-group-item d-flex justify-content-between text-info">Health Regen ✚<span>${formatProfileStat(lifeRegen)} / turn</span></li>
		<li class="list-group-item d-flex justify-content-between text-primary">Speed ⚡<span>${formatProfileStat(playerSpeed)} / turn</span></li>
		<li class="list-group-item d-flex justify-content-between text-warning">Reputation<span>${user.reputation}</span></li>
		<li class="list-group-item d-flex justify-content-between text-danger">Rep Multiplier<span>${user.rep_multi}X</span></li>
		<li class="list-group-item d-flex justify-content-between rainbow-text">Loot Shards<span>${user.loot_shard}</span></li>
		</ul>
		<div class="text-center mt-3">
		<button id="levelUpBtn" class="btn level-btn px-4 py-2 btn-success">Level Up</button>
		</div>
      </div>
    </div>  
  `;

	// Add event listener for level up button
	const levelUpBtn = document.getElementById('levelUpBtn');
	if (levelUpBtn) {
		levelUpBtn.addEventListener('click', () => levelUpUser());
	}
}

// Reload user info from API
function reloadUserInfo() {
	const callback = (status, data) => {
		// If data loaded successfully, render it
		if (status === 200 && data?.user_data) {
			loadUserInfo(data);
		} else {
			// Show error if loading failed
			console.error('Failed to reload user.', data);
			const userDiv = document.getElementById('userInfo');
			if (userDiv) {
				userDiv.innerHTML = `<div class="text-danger text-center">Failed to load user.</div>`;
			}
		}
	};

	// Fetch user data
	fetchMethod(`${currentUrl}/api/users/userData`, callback, 'GET', null, token);
}
