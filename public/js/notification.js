// Run once DOM is ready to set up the notification container
document.addEventListener('DOMContentLoaded', initNotifSystem);

// Creates the notification container if it doesn't exist
function initNotifSystem() {
	if (!document.getElementById('notifContainer')) {
		const container = document.createElement('div');
		container.id = 'notifContainer';
		document.body.appendChild(container);
	}
}

// Shows a notification on screen
function showNotif({ status, message = '', duration = 3000 }) {
	if (status === 204 && !message) {
		message = 'Action completed successfully.';
	}

	const type =
		status >= 200 && status < 300
			? 'success'
			: status >= 400 && status < 500
				? 'error'
				: status >= 500
					? 'error'
					: 'info';

	// Create notification element
	const notif = document.createElement('div');
	notif.className = `custom-notif ${type}`;
	notif.innerText = message;

	// Add close button
	const closeBtn = document.createElement('button');
	closeBtn.className = 'notif-close';
	closeBtn.innerHTML = '&times;';
	closeBtn.onclick = () => notif.remove();
	notif.appendChild(closeBtn);

	// Add to container
	const container = document.getElementById('notifContainer');
	container.appendChild(notif);

	// Fade in
	requestAnimationFrame(() => {
		notif.classList.add('show');
	});

	// Auto remove after duration
	setTimeout(() => {
		if (notif.parentNode) {
			notif.classList.remove('show');
			setTimeout(() => notif.remove(), 300);
		}
	}, duration);
}
