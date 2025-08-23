function loadModifierList(modifierListData) {
	// Get modifier list container and search bar elements
	const modifierList = document.getElementById('modifierList');
	const searchBar = document.getElementById('searchBarModifier');

	// Show loading message
	modifierList.innerHTML = `<div class="text-muted text-center">Loading modifiers...</div>`;

	// If the provided data is not an array, show error and stop
	if (!Array.isArray(modifierListData)) {
		modifierList.innerHTML = `<div class="text-danger text-center">Failed to load modifiers.</div>`;
		return;
	}

	// If the array is empty, show warning and stop
	if (modifierListData.length === 0) {
		modifierList.innerHTML = `<div class="text-warning text-center">No modifiers found.</div>`;
		return;
	}

	// Create modifier cards in the container
	createCardList(modifierList, modifierListData, {
		datasetFields: ['name', 'description'], // Fields to store for search
		cardClass: 'modifier-card', // CSS class for each card
		enableClick: false, // Disable click events
		displayFn: (mod) => `
		<div class="card-body">
			<h5 class="card-title">${mod.name}</h5>
			<p class="card-text mb-1">${mod.description}</p>
			<p class="card-text mb-1">Weight: ${mod.weight}</p>
		</div>
		`,
	});

	// Enable search functionality for modifiers
	enableSearch(searchBar, '.modifier-card', ['name', 'description']);
}
