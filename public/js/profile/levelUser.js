// Sends a request to level up the user
function levelUpUser() {
	const callback = (status, data) => {
		if (status === 200) {
			// Success: show notification, play confetti, refresh stats
			showNotif({ status: status, message: data.message });
			showConfettiOverlay('Level up!');
			reloadUserInfo();
		} else {
			// Failure: show error message
			showNotif({ status: status, message: data.message });
		}
	}
	
	fetchMethod(`${currentUrl}/api/level/`, callback, 'PUT', null, token);
}

// Handles the response after attempting to level up

