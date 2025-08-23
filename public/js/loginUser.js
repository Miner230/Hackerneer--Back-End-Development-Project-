document.addEventListener('DOMContentLoaded', function () {
	const callback = (responseStatus, responseData) => {
		if (responseStatus == 200) {
			// Check if login was successful
			if (responseData.token) {
				// Store the token in local storage
				localStorage.setItem('token', responseData.token);
				// Redirect to profile page after login
				window.location.href = 'profile.html';
			}
		} else {
			// Show notification on error with the response message
			showNotif({
				status: 500,
				message: responseData.message,
			});
		}
	};

	const loginForm = document.getElementById('loginForm');

	loginForm.addEventListener('submit', function (event) {
		event.preventDefault();

		const username = document.getElementById('username').value;
		const password = document.getElementById('password').value;

		const data = {
			username: username,
			password: password,
		};
		// Perform login request
		fetchMethod(currentUrl + '/api/hashing/login', callback, 'POST', data);

		// Reset the form fields
		loginForm.reset();
	});
});
