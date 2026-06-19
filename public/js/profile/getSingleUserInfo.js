// Load user info and render profile card
function computePlayerMaxHealth(user, playerBonuses = {}) {
	const level = Math.max(1, Number(user?.level || 1));
	const baseMaxHealth = Math.floor(100 + level * 15);
	const flatHealth = Number(playerBonuses.player_flat_health || 0);
	const maxHealthPercent = Number(playerBonuses.player_max_health_percent || 0);

	return Math.floor((baseMaxHealth + flatHealth) * (1 + maxHealthPercent / 100));
}

function computePlayerSpeed(playerBonuses = {}) {
	const speedBonus = Number(playerBonuses.player_speed_bonus || 0);
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
	const xpProgress = data.xpProgress || { current: user.experience || 0, required: 100, percent: 0 };
	const playerBonuses = data.playerBonuses || {};
	const totalHealth = computePlayerMaxHealth(user, playerBonuses);
	const lifeRegen = Number(playerBonuses.player_life_regen || 0);
	const playerSpeed = computePlayerSpeed(playerBonuses);

	// Store username and level in localStorage
	localStorage.setItem('username', user.username);
	localStorage.setItem('level', user.level);
	sessionStorage.setItem('currentUserId', String(user.id));

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
		<li class="list-group-item profile-xp-row">
			<div class="profile-xp-block">
				<div class="profile-xp-label">Experience</div>
				<div class="profile-xp-values">${formatProfileStat(xpProgress.current)} / ${formatProfileStat(xpProgress.required)}</div>
				<div class="profile-xp-bar" aria-label="Experience progress">
					<div class="profile-xp-fill" style="width: ${xpProgress.percent}%"></div>
				</div>
			</div>
		</li>
		<li class="list-group-item d-flex justify-content-between text-info">Total Health ♥<span>${formatProfileStat(totalHealth)}</span></li>
		<li class="list-group-item d-flex justify-content-between text-info">Health Regen ✚<span>${formatProfileStat(lifeRegen)} / turn</span></li>
		<li class="list-group-item d-flex justify-content-between text-primary">Speed ⚡<span>${formatProfileStat(playerSpeed)} / turn</span></li>
		<li class="list-group-item d-flex justify-content-between rainbow-text">Loot Shards<span>${user.loot_shard}</span></li>
		</ul>
      </div>
    </div>  
	`;

	// Profile levels up from delve kill XP automatically.
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
