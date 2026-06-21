// Grab token from local storage for user session tracking
const token = localStorage.getItem('token');

// Wait until DOM is ready to build the navbar
document.addEventListener('DOMContentLoaded', function () {
	// Define the HTML for the navbar
	const navbarHTML = `
	<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
		<div class="container">
			<a class="navbar-brand" href="index.html">
				<img src="https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/backgrounds/logo.png"
					class="logo img-fluid rounded-circle" alt="Logo"
					style="max-height: 60px; width: auto;" />
			</a>
			<button class="navbar-toggler" type="button" data-bs-toggle="collapse"
					data-bs-target="#navbarNav" aria-controls="navbarNav"
					aria-expanded="false" aria-label="Toggle navigation">
				<span class="navbar-toggler-icon"></span>
			</button>

			<div class="collapse navbar-collapse" id="navbarNav">
				<ul class="navbar-nav me-auto">
					<li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
					<li class="nav-item">
						<a class="nav-link nav-play-btn" href="world.html" aria-label="Play">
							<span class="nav-play-icon" aria-hidden="true">▶</span>
							<span class="nav-play-label">Play</span>
						</a>
					</li>
					<li class="nav-item"><a class="nav-link" href="logbook.html">Logbook</a></li>
				</ul>

				<ul class="navbar-nav ms-auto align-items-center">
					<li class="nav-item"><a id="loginButton" class="nav-link" href="login.html">Login</a></li>
					<li class="nav-item"><a id="registerButton" class="btn btn-outline-light" href="register.html">Register</a></li>

					<li class="nav-item dropdown d-none" id="profileDropdown">
						<a href="#" class="nav-link dropdown-toggle d-flex align-items-center gap-2"
						   id="profileLabel" role="button" data-bs-toggle="dropdown" aria-expanded="false">
							<span id="profileUsernameText">Profile</span>
							<img id="navbarAvatar"
								src="https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/backgrounds/mage.png"
								alt="Profile" class="rounded-circle"
								style="width: 36px; height: 36px; object-fit: cover; border: 2px solid #ccc;">
						</a>
						<ul class="dropdown-menu dropdown-menu-end navbar-dark bg-dark">
							<li><a class="dropdown-item" href="profile.html">View Profile</a></li>
							<li><a class="dropdown-item" href="inventory.html">Inventory</a></li>
							<li><hr class="dropdown-divider"></li>
							<li><a id="logoutDropdown" class="dropdown-item text-danger" href="#">Logout</a></li>
						</ul>
					</li>
				</ul>
			</div>
		</div>
	</nav>
	`;

	// Inject navbar HTML into the placeholder
	document.getElementById('navbar-placeholder').innerHTML = navbarHTML;

	// Highlight the active navigation tab based on current page
	const currentPage = location.pathname.split('/').pop() || 'index.html';
	document.querySelectorAll('.navbar-nav .nav-link').forEach((link) => {
		if (link.getAttribute('href') === currentPage) {
			link.classList.add('active');
		}
	});

	// Update profile label and visibility based on login state
	updateNavbarProfileLabel();

	// Handle logout click — clear stored session data and redirect
	document.addEventListener('click', (e) => {
		if (e.target && e.target.id === 'logoutDropdown') {
			localStorage.removeItem('token');
			localStorage.removeItem('username');
			localStorage.removeItem('level');
			if (window.GameFullscreen?.clearPersistentMode) {
				GameFullscreen.clearPersistentMode();
			}
			updateNavbarProfileLabel();
			window.location.href = 'login.html';
		}
	});
});

// Update profile section of navbar based on login state
function updateNavbarProfileLabel() {
	const username = localStorage.getItem('username');
	const level = localStorage.getItem('level') || '?';

	const loginBtn = document.getElementById('loginButton');
	const registerBtn = document.getElementById('registerButton');
	const profileDropdown = document.getElementById('profileDropdown');
	const profileText = document.getElementById('profileUsernameText');

	if (username) {
		// Show profile dropdown and hide login/register
		if (profileDropdown) profileDropdown.classList.remove('d-none');
		if (profileText) profileText.textContent = `${username} (Lv. ${level})`;
		if (loginBtn) loginBtn.classList.add('d-none');
		if (registerBtn) registerBtn.classList.add('d-none');
	} else {
		// Show login/register and hide profile dropdown
		if (profileDropdown) profileDropdown.classList.add('d-none');
		if (profileText) profileText.textContent = 'Profile';
		if (loginBtn) loginBtn.classList.remove('d-none');
		if (registerBtn) registerBtn.classList.remove('d-none');
	}
}

// Inject footer HTML into the footer placeholder
document.addEventListener('DOMContentLoaded', function () {
	const footerHTML = `
		<footer class="mt-auto py-3 bg-dark text-white text-center">
			<p class="m-0 px-4">&copy; 2025 Hackerneer. Made for Back End Development CA2. Most of the stuff on this website was made by Angus Kaile Wight. Credit for images in readme.</p>
		</footer>
	`;
	const footerPlaceholder = document.getElementById('footer-placeholder');
	if (footerPlaceholder) {
		footerPlaceholder.innerHTML = footerHTML;
	}
});

window.updateNavbarProfileLabel = updateNavbarProfileLabel;
