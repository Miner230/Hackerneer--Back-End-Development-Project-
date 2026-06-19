// Run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
	attachEventListeners();
});

// Attach event listeners to claim loot UI elements
function attachEventListeners() {
	const input = document.getElementById('claimAmountInput');
	const incBtn = document.getElementById('increaseAmount');
	const decBtn = document.getElementById('decreaseAmount');
	const claimBtn = document.getElementById('claimLootBtn');
	const overlay = document.getElementById('claimOverlay');
	const grid = document.getElementById('claimedItemGrid');
	const messageBox = document.getElementById('claimMessage');
	const closeBtn = document.getElementById('closeClaimOverlayBtn');

	// Increase claim amount
	incBtn?.addEventListener('click', () => incrementClaimAmount(input));

	// Decrease claim amount (min 1)
	decBtn?.addEventListener('click', () => decrementClaimAmount(input));

	// Close overlay and reset UI
	closeBtn?.addEventListener('click', () => resetClaimOverlayUI(overlay, grid, messageBox));

	// Handle claim button click
	claimBtn?.addEventListener('click', () => {
		handleClaimLoot(input, overlay, grid, messageBox, token);
	});
}

// Increment claim amount
function incrementClaimAmount(input) {
	const val = parseInt(input.value);
	if (!isNaN(val)) input.value = val + 1;
}

// Decrement claim amount
function decrementClaimAmount(input) {
	const val = parseInt(input.value);
	if (!isNaN(val) && val > 1) input.value = val - 1;
}

// Reset and hide the claim overlay UI
function resetClaimOverlayUI(overlay, grid, messageBox) {
	overlay.classList.add('d-none');
	grid.innerHTML = '';
	messageBox.textContent = '';
	messageBox.style.display = 'none';
}

// Handles the claim loot process
function handleClaimLoot(input, overlay, grid, messageBox, token) {
	const amount = parseInt(input.value);
	grid.innerHTML = '';
	messageBox.textContent = '';
	messageBox.style.display = 'none';

	const callback = (status, data) => {
		// Show error notification for conflict or bad request
		if (status === 409 || status === 400) {
			showNotif({ status, message: data.message });
			if (status === 409) loadInventoryData();
			return;
		}

		// Display claimed loot in overlay
		if (status === 200 && Array.isArray(data.claimed)) {
			overlay.classList.remove('d-none');

			data.claimed.forEach(({ id, name, rarity, quantity }) => {
				const slot = document.createElement('div');
				slot.className = `inventory-slot rarity-${rarity.toLowerCase()} position-relative`;
				slot.title = `${name} x${quantity}`;

				const img = document.createElement('img');
				img.src = typeof getLootImageSrc === 'function' ? getLootImageSrc(id) : `https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/items/L${id}.png`;
				img.alt = name;

				const qnt = document.createElement('div');
				qnt.className = 'inventory-count';
				qnt.textContent = `x${quantity}`;

				slot.appendChild(img);
				slot.appendChild(qnt);
				grid.appendChild(slot);
			});

			loadInventoryData();
			showNotif({ status, message: data.message });
		}
	};

	fetchMethod(`${currentUrl}/api/loot/claim/${amount}/users`, callback, 'GET', null, token);
}

// Returns a color hex code based on item rarity
function getColorByRarity(rarity) {
	switch (rarity.toLowerCase()) {
		case 'common':
			return '#aaaaaa';
		case 'uncommon':
			return '#3ecc3e';
		case 'rare':
			return '#2d89ff';
		case 'epic':
			return '#aa44ff';
		case 'legendary':
			return '#ffb347';
		default:
			return 'gold';
	}
}
