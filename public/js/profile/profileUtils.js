document.addEventListener('DOMContentLoaded', () => {
	generateTabs(tabsConfig, '#profileTabContainer', {
		tabNavId: 'profileTabs',
	});

	loadData();
});

function loadData() {
	const callback = (status, data) => {
		if (status !== 200 || !data) {
			document.getElementById('profileTabContainer').innerHTML = `
				<div class="text-danger text-center">Failed to load profile data.</div>`;
			return;
		}

		loadUserInfo(data);
		loadDiceInfo(data);
	};

	// Centralized fetch here
	fetchMethod(`${currentUrl}/api/dice/profile`, callback, 'GET', null, token);
}

const tabsConfig = [
	{
		id: 'user',
		title: 'User Info',
		listId: 'userInfo',
	},
	{
		id: 'dice',
		title: 'Dice Stats',
		listId: 'diceInfo',
	},
];
