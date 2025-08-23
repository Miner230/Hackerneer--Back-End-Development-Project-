document.addEventListener('DOMContentLoaded', () => {
	const leaderboard = document.getElementById('leaderboardList');
	const body = document.body;
	let isHighlighted = false; // Tracks highlight state

	// Runs whenever the user scrolls
	const handleScroll = () => {
		if (!leaderboard) return; // Exit if leaderboard not found

		// Get leaderboard's position relative to viewport
		const rect = leaderboard.getBoundingClientRect();
		const inView = rect.top < window.innerHeight && rect.bottom > 0;

		// Add highlight when leaderboard is in view
		if (inView && !isHighlighted) {
			body.classList.add('highlight-leaderboard');
			isHighlighted = true;
		} 
		// Remove highlight when leaderboard is out of view
		else if (!inView && isHighlighted) {
			body.classList.remove('highlight-leaderboard');
			isHighlighted = false;
		}
	};

	// Listen for scroll events
	window.addEventListener('scroll', handleScroll);
});
