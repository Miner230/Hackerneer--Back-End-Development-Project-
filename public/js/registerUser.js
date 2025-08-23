// Wait for DOM to be fully loaded before attaching events
document.addEventListener('DOMContentLoaded', function () {
	const signupForm = document.getElementById('signupForm');
	if (signupForm) {
		signupForm.addEventListener('submit', registerUser);
	}
});

// Handle user registration form submission
function registerUser(event) {
	event.preventDefault(); // Prevent default form submission

	// Get form input values
	const username = document.getElementById('username').value;
	const password = document.getElementById('password').value;
	const confirmPassword = document.getElementById('confirmPassword').value;

	// Check if passwords match
	if (password === confirmPassword) {
		// Prepare data payload
		const data = {
			username: username,
			password: password,
		};

		// Handle API response after attempting registration
		const callback = (responseStatus, responseData) => {
			if (responseStatus === 200 && responseData.token) {
				// Save JWT token to localStorage
				localStorage.setItem('token', responseData.token);

				// Redirect to profile page
				window.location.href = 'profile.html';
			} else {
				// Show notification with backend message
				showNotif({
					status: 500,
					message: responseData.message || 'Registration failed.'
				});
			}
		};

		// Send registration request to backend
		fetchMethod(`${currentUrl}/api/hashing/register`, callback, 'POST', data);

		// Reset form fields
		event.target.reset();
	} else {
		// Show notification if passwords do not match
		showNotif({
			status: 500,
			message: 'Passwords do not match'
		});
	}
}
