// When the page loads, initialize the tabbed interface and listeners
document.addEventListener('DOMContentLoaded', () => {
	// Dynamically generate the tabs and content containers
	generateTabs(tabConfig, '#logbookTabContainer', {
		tabNavId: 'logbookTabs',
	});

	// Load initial data
	loadData();
});

// Fetch and load all logbook data
function loadData() {
	const callback = (status, data) => {
		// If request successful, load each category
		if (status === 200) {
			loadMonsterList(data.monster_data);
			loadLootList(data.lootRows);
			loadModifierList(data.modifier_data);
		}
	};

	// Call API for logbook data
	fetchMethod(`${currentUrl}/api/delve/logbookdata`, callback);
}

// Configuration for each tab in the logbook UI
const tabConfig = [
	{
		id: 'monster', // Tab ID
		title: 'Monsters', // Tab title
		searchPlaceholder: 'Search for monsters...', // Search bar placeholder
		searchId: 'searchBarMonster', // Search input ID
		listId: 'monsterList', // Content list container ID
	},
	{
		id: 'loot',
		title: 'Loot',
		searchPlaceholder: 'Search for loot...',
		searchId: 'searchBarloot',
		listId: 'lootList',
	},
	{
		id: 'modifiers',
		title: 'Modifiers',
		searchPlaceholder: 'Search for modifiers...',
		searchId: 'searchBarModifier',
		listId: 'modifierList',
	},
];
