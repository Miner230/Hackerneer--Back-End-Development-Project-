function applyRarityStyles(containerSelector = '.loot-card') {
	// Select all loot card containers
	const lootCards = document.querySelectorAll(containerSelector);

	lootCards.forEach((lootCard) => {
		// Find the .card element inside each loot card container
		const card = lootCard.querySelector('.card');
		if (!card) return; 

		// Find the <p> tag that contains the "Rarity:" text
		const rarityP = Array.from(card.querySelectorAll('p')).find((p) =>
			p.textContent.toLowerCase().startsWith('rarity:')
		);
		if (!rarityP) return; 

		// Extract the rarity value (e.g., "Common", "Rare") and make it lowercase
		const rarity = rarityP.textContent.split(':')[1]?.trim().toLowerCase();
		if (!rarity) return; 

		// Add a CSS class to the .card element (e.g., rarity-common, rarity-rare)
		card.classList.add(`rarity-${rarity}`);
	});
}