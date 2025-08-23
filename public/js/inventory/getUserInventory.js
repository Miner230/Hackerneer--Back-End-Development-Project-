// Run when the page loads
document.addEventListener('DOMContentLoaded', () => {
	loadInventoryData();
	registerInventoryOverlayEvents();
});

// Fetch and render inventory data
function loadInventoryData({ useItem = null } = {}) {
	fetchMethod(`${currentUrl}/api/inventory/`, renderInventoryGrid, 'GET', null, token);
	if (useItem) {
		const url = `${currentUrl}/api/inventory/${useItem.loot_id}`;
		fetchMethod(url, useItemCallback(useItem), 'PUT', null, token);
	}
}

// Set up global event listeners for overlay buttons
function registerInventoryOverlayEvents() {
	const cancel = document.getElementById('cancelUseBtn');
	const confirm = document.getElementById('confirmUseBtn');

	cancel?.addEventListener('click', closeUseOverlay);
	confirm?.addEventListener('click', () => confirmItemUse());
}

// Bind hover and click events for inventory slots
function bindInventoryEvents(slot, tooltip, item) {
	slot.addEventListener('mouseenter', () => showTooltip(tooltip));
	slot.addEventListener('mouseleave', () => hideTooltip(tooltip));
	slot.addEventListener('click', () => openUseOverlay(item));
}

// Handle item use confirmation
function confirmItemUse() {
	const confirmBtn = document.getElementById('confirmUseBtn');
	const item = confirmBtn.dataset.item ? JSON.parse(confirmBtn.dataset.item) : null;
	if (item) confirmUseItem(item);
}

// Render inventory grid
function renderInventoryGrid(status, data) {
	const grid = document.getElementById('inventoryGrid');

	// Check for valid inventory data
	const inventory = data?.inventory;
	if (status !== 200 || !Array.isArray(inventory)) {
		grid.innerHTML = `<div class="text-danger text-center">Inventory is empty.</div>`;
		return;
	}

	grid.innerHTML = '';
	const order = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };

	// Sort by rarity and render each slot
	inventory
		.filter((i) => i.quantity > 0)
		.sort((a, b) => order[b.rarity?.toLowerCase()] - order[a.rarity?.toLowerCase()])
		.forEach((item) => createInventorySlot(item, grid));
}

// Create a single inventory slot
function createInventorySlot(item, grid) {
	const rarity = `rarity-${(item.rarity || 'common').toLowerCase()}`;
	const slot = document.createElement('div');
	slot.className = `inventory-slot inventory-entry ${rarity}`;
	slot.dataset.name = item.name.toLowerCase();

	const img = document.createElement('img');
	img.src = `https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/items/L${item.loot_id}.png`;
	img.alt = item.name;

	const count = document.createElement('div');
	count.className = 'inventory-count';
	count.textContent = `x${item.quantity}`;

	const tooltip = buildTooltip(item, rarity);

	slot.appendChild(img);
	if (item.quantity > 1) slot.appendChild(count);
	slot.appendChild(tooltip);
	grid.appendChild(slot);

	bindInventoryEvents(slot, tooltip, item);
}

// Build tooltip element for an inventory slot
function buildTooltip(item, rarity) {
	const tip = document.createElement('div');
	tip.className = `tooltip-box ${rarity}`;
	tip.innerHTML = `
		<div class="card-title">${item.name}</div>
		<div class="card-text">${item.stat_description}</div>
		<div class="card-text fst-italic">${item.lore}</div>
		<div class="card-text">${item.rarity}</div>
	`;
	return tip;
}

// Show tooltip
function showTooltip(tip) {
	if (window.innerWidth <= 768) return;
	tip.style.left = '70px';
	tip.style.display = 'block';
	tip.style.visibility = 'hidden';

	requestAnimationFrame(() => {
		const rect = tip.getBoundingClientRect();
		if (rect.left + rect.width > window.innerWidth) {
			tip.style.left = 'auto';
			tip.style.right = '70px';
		}
		tip.style.top =
			rect.top + rect.height > window.innerHeight
				? `-${rect.bottom - window.innerHeight + 20}px`
				: '0';
		tip.style.visibility = 'visible';
	});
}

// Hide tooltip
function hideTooltip(tip) {
	if (window.innerWidth <= 768) return;
	tip.style.left = '';
	tip.style.right = '';
	tip.style.top = '';
	tip.style.visibility = '';
	tip.style.display = '';
}

// Open overlay for item use confirmation
function openUseOverlay(item) {
	document.getElementById('useItemTitle').textContent = `Use "${item.name}"?`;
	document.getElementById('useItemDesc').textContent =
		item.stat_description || 'Are you sure you want to use this item?';
	document.getElementById('confirmUseBtn').dataset.item = JSON.stringify(item);
	document.getElementById('useItemOverlay').classList.remove('d-none');
}

// Close item use overlay
function closeUseOverlay() {
	document.getElementById('useItemOverlay').classList.add('d-none');
}

// Execute item use request
function confirmUseItem(item) {
	loadInventoryData({ useItem: item });
}

// Handle API response after using an item
function useItemCallback(item) {
	return (status, data) => {
		showNotif({ status, message: data.message });
		if (status === 200) {
			document.getElementById('useItemOverlay').classList.add('d-none');
			loadInventoryData();
		}
	};
}
