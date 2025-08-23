function loadMonsterList(monsterListData) {
	// Get monster list container and search bar elements
	const monsterList = document.getElementById('monsterList');
	const searchBar = document.getElementById('searchBarMonster');

	// If no monsters found, display message and stop
	if (monsterListData.length === 0) {
		monsterList.innerHTML = `<div class="text-warning text-center">No monsters found.</div>`;
		return;
	}

	// Create monster cards in the container
	createCardList(monsterList, monsterListData, {
		datasetFields: ['name', 'description'], // Fields to store in dataset for search
		cardClass: 'monster-card', // CSS class for each card
		enableClick: false, // Disable click events
		displayFn: (monster) => `
			<div class="card-body text-center">
				<img 
					src="https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/monsters/m${monster.id}.png" 
					class="card-img-top mb-3"
					alt="${monster.name} image">
				<h5 class="card-title">${monster.name}</h5>
				<p class="card-text mb-1">${monster.description}</p>
			</div>
		`,
	});

	// Enable search functionality for monsters
	enableSearch(searchBar, '.monster-card', ['name', 'description']);
}
