function loadLootList(lootListData) {
	// Get loot list container and search bar elements
	const lootList = document.getElementById('lootList');
	const searchBar = document.getElementById('searchBarloot');

	// Show loading message
	lootList.innerHTML = `<div class="text-muted text-center">Loading loot...</div>`;

	// If the provided data is not an array, show error and stop
	if (!Array.isArray(lootListData)) {
		lootList.innerHTML = `<div class="text-danger text-center">Failed to load loot.</div>`;
		return;
	}

	// If the array is empty, show warning and stop
	if (lootListData.length === 0) {
		lootList.innerHTML = `<div class="text-warning text-center">No loot found.</div>`;
		return;
	}

	// Create loot cards in the container
	createCardList(lootList, lootListData, {
		datasetFields: ['name', 'description'], // Fields to store for search
		cardClass: 'loot-card', // CSS class for each card
		enableClick: false, // Disable click events
		displayFn: (loot) => {
			const imgSrc =
				typeof getLootImageSrc === 'function'
					? getLootImageSrc(loot.id)
					: `https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/items/L${loot.id}.png`;
			return `
		<div class="card-body text-center">
		  <img 
			src="${imgSrc}" 
			class="card-img-top mb-3"
			alt="${loot.name} image">
		  <h5 class="card-title">${loot.name}</h5>
		  <p class="card-text mb-1">${loot.lore}</p>
		  <p class="card-text">Rarity: ${loot.rarity}</p>
		</div>
	  `;
		},
	});

	// Apply rarity-based CSS styles to the loot cards
	applyRarityStyles();

	// Enable search functionality for loot
	enableSearch(searchBar, '.loot-card', ['name', 'lore', 'rarity']);
}
