document.addEventListener('DOMContentLoaded', () => {
	loadData(); // Fetch leaderboard data when page loads
});

function loadData() {
	const callback = (responseStatus, responseData) => {
		const leaderboardList = document.getElementById('leaderboardList');

		// Show error message if leaderboard not found
		if (responseStatus === 404) {
			leaderboardList.innerHTML = `<div class="text-white">${responseData.message}</div>`;
			return;
		}

		// Render leaderboard and start auto-scroll
		createLeaderboardItem(responseData);
		startAutoScroll(leaderboardList);
	};

	// Get leaderboard data from API
	fetchMethod(`${currentUrl}/api/users/leaderboard`, callback);
}

function startAutoScroll(container) {
	let scrollingDown = true;
	let scrollStep = 1;
	let scrolling = true;

	// Automatically scroll leaderboard up and down
	const scrollInterval = setInterval(() => {
		if (!scrolling) return;

		if (scrollingDown) {
			container.scrollTop += scrollStep;
			if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
				scrollingDown = false; // Reverse direction at bottom
			}
		} else {
			container.scrollTop -= scrollStep;
			if (container.scrollTop <= 0) {
				scrollingDown = true; // Reverse direction at top
			}
		}
	}, 30); // Adjust speed here (lower = faster)

	// Pause scrolling on hover
	container.addEventListener('mouseenter', () => (scrolling = false));
	container.addEventListener('mouseleave', () => (scrolling = true));
}

function createLeaderboardItem(data) {
	// Append each leaderboard entry to the container
	data.forEach((user, index) => {
		leaderboardList.innerHTML += `
			<div class="leaderboard-item">
				#${index + 1} ${user.username}<br>
				Level: ${user.level}<br>
				Reputation: ${user.reputation}
			</div>
		`;
	});
}
