// Run when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
	handleNavbarVisibility();
	handleRegisterSectionVisibility();
	registerNavbarListeners();
});

// Retrieve token from local storage
function getToken() {
	return localStorage.getItem('token');
}

// Redirect to login page if the user is not logged in
function redirectIfNotLoggedIn(redirectURL = 'login.html') {
	if (!getToken()) {
		alert('You must be logged in to access this page.');
		window.location.href = redirectURL;
	}
}

// Redirect to profile page if the user is already logged in
function redirectIfLoggedIn(redirectURL = 'profile.html') {
	if (getToken()) {
		alert("You're already logged in.");
		window.location.href = redirectURL;
	}
}

// Show or hide navbar elements based on login state
function handleNavbarVisibility() {
	const token = getToken();

	const loginButton = document.getElementById('loginButton');
	const registerButton = document.getElementById('registerButton');
	const profileDropdown = document.getElementById('profileDropdown');

	if (token) {
		// Hide login/register buttons, show profile dropdown
		loginButton?.classList.add('d-none');
		registerButton?.classList.add('d-none');
		profileDropdown?.classList.remove('d-none');
	} else {
		// Show login/register buttons, hide profile dropdown
		loginButton?.classList.remove('d-none');
		registerButton?.classList.remove('d-none');
		profileDropdown?.classList.add('d-none');
	}
}

// Show or hide the register section on the index page
function handleRegisterSectionVisibility() {
	const registerSection = document.querySelector('.register-index');
	const titleDesc = document.querySelector('.title-desc');
	if (!registerSection) return;

	if (getToken()) {
		// Hide registration section for logged-in users
		registerSection.classList.add('d-none');
		titleDesc?.classList.add('pb-5', 'mb-5');
	} else {
		// Show registration section for guests
		registerSection.classList.remove('d-none');
		titleDesc?.classList.remove('pb-5');
		titleDesc?.classList.add('mb-5');
	}
}

// Attach event listeners for navbar actions
function registerNavbarListeners() {
	const logoutDropdown = document.getElementById('logoutDropdown');
	if (!logoutDropdown) return;

	// Logout button click handler
	logoutDropdown.addEventListener('click', (e) => {
		e.preventDefault();

		// Remove all stored authentication data
		localStorage.removeItem('token');
		localStorage.removeItem('username');
		localStorage.removeItem('level');

		// Update navbar if function exists
		if (typeof updateNavbarProfileLabel === 'function') {
			updateNavbarProfileLabel();
		}

		// Redirect to homepage after logout
		window.location.href = 'index.html';
	});
}
