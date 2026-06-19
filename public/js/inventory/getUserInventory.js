// Run when the page loads
document.addEventListener('DOMContentLoaded', () => {
	registerInventoryTabs();
	loadInventoryData({ immediate: true });
	registerInventoryOverlayEvents();
	registerAdminGrantButton();
});

const INVENTORY_TAB_STORAGE_KEY = 'inventoryActiveTab';
const INVENTORY_RELOAD_DEBOUNCE_MS = 150;
let cachedInventory = [];
let activeInventoryTab = 'all';
let inventoryReloadTimer = null;
let inventoryRequestInFlight = false;
let pendingInventoryForceReload = false;

function registerInventoryTabs() {
	const savedTab = localStorage.getItem(INVENTORY_TAB_STORAGE_KEY);
	if (['all', 'dice', 'items'].includes(savedTab)) {
		activeInventoryTab = savedTab;
	}

	document.querySelectorAll('.inventory-tab').forEach((button) => {
		button.classList.toggle('inventory-tab--active', button.dataset.tab === activeInventoryTab);
		button.addEventListener('click', () => {
			const tab = button.dataset.tab;
			if (!tab || tab === activeInventoryTab) return;
			activeInventoryTab = tab;
			localStorage.setItem(INVENTORY_TAB_STORAGE_KEY, tab);
			document.querySelectorAll('.inventory-tab').forEach((tabButton) => {
				tabButton.classList.toggle('inventory-tab--active', tabButton.dataset.tab === tab);
			});
			renderInventoryItems(cachedInventory);
		});
	});
}

function filterInventoryByTab(items, tab) {
	if (tab === 'dice') {
		return items.filter((item) => item.mechanic === 'equip_dice');
	}
	if (tab === 'items') {
		return items.filter((item) => item.mechanic !== 'equip_dice');
	}
	return items;
}

function registerAdminGrantButton() {
	const button = document.getElementById('adminGrantKitBtn');
	if (!button) return;

	button.addEventListener('click', () => {
		if (!token) return;
		button.disabled = true;
		fetchMethod(
			`${currentUrl}/api/inventory/admin/grant-crafting-kit`,
			(status, data) => {
				button.disabled = false;
				if (status === 200) {
					if (data?.message) {
						showNotif({ status, message: data.message });
					}
					if (!applyInventoryResponse(data)) {
						renderInventoryGrid(status, data);
					}
					return;
				}
				const message = data?.message || 'Failed to grant crafting kit.';
				showNotif({ status, message });
			},
			'POST',
			null,
			token
		);
	});
}

function syncAdminGrantButton(isAdmin) {
	const button = document.getElementById('adminGrantKitBtn');
	if (!button) return;
	button.classList.toggle('d-none', !isAdmin);
}

// Fetch and render inventory data
function loadInventoryData({ useItem = null, immediate = false } = {}) {
	if (useItem) {
		const url = `${currentUrl}/api/inventory/${useItem.loot_id}`;
		fetchMethod(url, useItemCallback(useItem), 'PUT', null, token);
	}

	scheduleInventoryReload(immediate);
}

function scheduleInventoryReload(immediate = false) {
	if (immediate) {
		if (inventoryReloadTimer) {
			clearTimeout(inventoryReloadTimer);
			inventoryReloadTimer = null;
		}
		pendingInventoryForceReload = false;
		return fetchInventoryNow();
	}

	if (inventoryRequestInFlight) {
		pendingInventoryForceReload = true;
		return;
	}

	if (inventoryReloadTimer) {
		clearTimeout(inventoryReloadTimer);
	}

	inventoryReloadTimer = setTimeout(() => {
		inventoryReloadTimer = null;
		fetchInventoryNow();
	}, INVENTORY_RELOAD_DEBOUNCE_MS);
}

function fetchInventoryNow() {
	if (inventoryRequestInFlight) {
		pendingInventoryForceReload = true;
		return;
	}

	inventoryRequestInFlight = true;
	fetchMethod(`${currentUrl}/api/inventory/`, (status, data) => {
		inventoryRequestInFlight = false;
		renderInventoryGrid(status, data);

		if (pendingInventoryForceReload) {
			pendingInventoryForceReload = false;
			fetchInventoryNow();
		}
	}, 'GET', null, token);
}

function mergeInventoryPatch(inventory, patch) {
	if (!patch || (!patch.dice?.length && !patch.consumables?.length)) {
		return inventory;
	}

	const nextInventory = [...(inventory || [])];

	(patch.dice || []).forEach((die) => {
		const dieId = die.dice_instance_id ?? die.id;
		const index = nextInventory.findIndex(
			(item) => (item.dice_instance_id ?? item.id) === dieId
		);
		if (index >= 0) nextInventory[index] = die;
		else nextInventory.push(die);
	});

	(patch.consumables || []).forEach((item) => {
		const index = nextInventory.findIndex(
			(entry) => entry.loot_id === item.loot_id && entry.mechanic !== 'equip_dice'
		);
		if (Number(item.quantity) <= 0) {
			if (index >= 0) nextInventory.splice(index, 1);
			return;
		}
		if (index >= 0) nextInventory[index] = { ...nextInventory[index], ...item };
		else nextInventory.push(item);
	});

	return nextInventory;
}

function applyInventoryResponse(data) {
	if (!data) return false;

	let applied = false;

	if (data.inventoryPatch) {
		cachedInventory = mergeInventoryPatch(cachedInventory, data.inventoryPatch);
		renderInventoryItems(cachedInventory);
		applied = true;
	} else if (Array.isArray(data.inventory)) {
		cachedInventory = data.inventory;
		renderInventoryItems(cachedInventory);
		applied = true;
	}

	if (Object.prototype.hasOwnProperty.call(data, 'equippedDice')) {
		if (typeof syncCraftingPanelFromResponse === 'function') {
			syncCraftingPanelFromResponse(data);
		}
		applied = true;
	}

	syncAdminGrantButton(Boolean(data.is_admin));
	return applied;
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
	slot.addEventListener('mouseenter', () => showTooltip(tooltip, slot));
	slot.addEventListener('mouseleave', () => hideTooltip(tooltip));
	slot.addEventListener('click', () => {
		if (item.mechanic === 'equip_dice') {
			openEquipOverlay(item);
			return;
		}
		if (typeof window.isCraftableItem === 'function' && window.isCraftableItem(item)) {
			return;
		}
		if (typeof window.isSocketableItem === 'function' && window.isSocketableItem(item)) {
			return;
		}
		openUseOverlay(item);
	});
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

	syncAdminGrantButton(Boolean(data?.is_admin));

	if (typeof renderEquippedDicePanel === 'function') {
		renderEquippedDicePanel(status === 200 ? data?.equippedDice || null : null);
	}

	const inventory = data?.inventory;
	if (status !== 200 || !Array.isArray(inventory)) {
		const message =
			status === 0
				? 'Could not reach the server. Check your connection and try again.'
				: status >= 500
					? 'Inventory failed to load. Run <code>npm run migrate_all</code> if this persists, then refresh.'
					: data?.message || data?.sqlMessage || 'Inventory is empty.';
		grid.innerHTML = `<div class="text-danger text-center">${message}</div>`;
		cachedInventory = [];
		return;
	}

	cachedInventory = inventory;
	renderInventoryItems(inventory);
}

function renderInventoryItems(inventory) {
	const grid = document.getElementById('inventoryGrid');
	if (!grid) return;

	grid.innerHTML = '';
	const order = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
	const filtered = filterInventoryByTab(
		inventory.filter((i) => i.quantity > 0),
		activeInventoryTab
	);

	if (!filtered.length) {
		const emptyLabel =
			activeInventoryTab === 'dice'
				? 'No dice in this tab.'
				: activeInventoryTab === 'items'
					? 'No items in this tab.'
					: 'Inventory is empty.';
		grid.innerHTML = `<div class="text-muted text-center">${emptyLabel}</div>`;
		return;
	}

	filtered
		.sort((a, b) => order[b.rarity?.toLowerCase()] - order[a.rarity?.toLowerCase()])
		.forEach((item) => {
			try {
				createInventorySlot(item, grid);
			} catch (error) {
				console.error('Failed to render inventory slot:', item?.name, error);
			}
		});
}

// Create a single inventory slot
function createInventorySlot(item, grid) {
	const rarity = `rarity-${(item.rarity || 'common').toLowerCase()}`;
	const isDice = item.mechanic === 'equip_dice';
	const slot = document.createElement('div');
	slot.className = `inventory-slot inventory-entry ${rarity}${isDice ? ' inventory-slot--dice' : ''}`;
	slot.dataset.name = item.name.toLowerCase();

	const img = document.createElement('img');
	img.src =
		isDice && typeof getDiceImageSrc === 'function'
			? getDiceImageSrc(item)
			: typeof getLootImageSrc === 'function'
				? getLootImageSrc(item.loot_id)
				: `https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/items/L${item.loot_id}.png`;
	img.alt = item.name;
	img.draggable = false;

	const count = document.createElement('div');
	count.className = 'inventory-count';
	count.textContent = `x${item.quantity}`;

	const tooltip = buildTooltip(item, rarity);

	slot.appendChild(img);
	if (!isDice && item.quantity > 1) slot.appendChild(count);
	slot.appendChild(tooltip);
	grid.appendChild(slot);

	bindInventoryEvents(slot, tooltip, item);
	if (typeof bindCraftableInventorySlot === 'function') {
		bindCraftableInventorySlot(slot, item);
	}
	if (typeof bindSocketableInventorySlot === 'function') {
		bindSocketableInventorySlot(slot, item);
	}
	if (typeof bindDiceInventorySlot === 'function') {
		bindDiceInventorySlot(slot, item);
	}
}

// Build tooltip element for an inventory slot
function buildTooltip(item, rarity) {
	const tip = document.createElement('div');
	tip.className = `tooltip-box ${rarity}`;

	const isCraftable =
		typeof window.isCraftableItem === 'function' && window.isCraftableItem(item);
	const isSocketable =
		typeof window.isSocketableItem === 'function' && window.isSocketableItem(item);
	const isDice = item.mechanic === 'equip_dice';
	const affixType = isCraftable ? getAffixTypeForMechanic(item.mechanic) : null;
	const flavor = isCraftable ? getAffixFlavorName(item.mechanic) : '';

	const title = item.name;
	const statLine = item.stat_description || '';

	const implicitHtml =
		isDice && Array.isArray(item.implicits) && item.implicits.length
			? `<div class="tooltip-section-label">Implicits</div><ul class="tooltip-affix-list tooltip-implicit-list">${renderImplicitListHtml(item.implicits)}</ul>`
			: '';

	const affixHtml =
		isDice && Array.isArray(item.modifiers) && item.modifiers.length
			? `<div class="tooltip-section-label">Crafted</div><ul class="tooltip-affix-list">${renderTooltipAffixListHtml(item.modifiers)}</ul>`
			: '';

	const socketHtml =
		isDice && Number(item.socket_count) > 0
			? `<div class="tooltip-section-label">Sockets (${item.sockets?.length || 0}/${item.socket_count})</div><ul class="tooltip-affix-list tooltip-socket-list">${renderSocketListHtml(item.sockets || [], item.socket_count, 'Empty')}</ul>`
			: '';

	const actionHtml = isDice
		? '<div class="tooltip-action">Click to equip · drop essences to craft · drop stones to socket</div>'
		: isCraftable
			? '<div class="tooltip-action">Drag onto a die to apply</div>'
			: isSocketable
				? '<div class="tooltip-action">Drag onto a die to socket</div>'
				: '';

	tip.innerHTML = `
		${affixType ? formatAffixBadge(affixType) : ''}
		<div class="tooltip-title">${title}</div>
		${isDice ? `<div class="tooltip-stat">Item Level ${item.item_level || 1}</div>` : ''}
		${isDice && Number(item.socket_count) > 0 ? `<div class="tooltip-stat">${item.socket_count} Socket${item.socket_count > 1 ? 's' : ''}</div>` : ''}
		${statLine ? `<div class="tooltip-stat">${statLine}</div>` : ''}
		${isCraftable && flavor ? `<div class="tooltip-flavor">${flavor}</div>` : ''}
		${implicitHtml}
		${affixHtml}
		${socketHtml}
		<div class="tooltip-rarity">${item.rarity || ''}</div>
		${actionHtml}
	`;
	return tip;
}

// Position tooltip within the viewport
function showTooltip(tip, slot) {
	if (window.innerWidth <= 768) return;

	const margin = 10;
	const gap = 8;
	const slotRect = slot.getBoundingClientRect();

	tip.style.display = 'block';
	tip.style.visibility = 'hidden';
	tip.style.position = 'fixed';
	tip.style.left = '0';
	tip.style.top = '0';
	tip.style.right = 'auto';
	tip.style.bottom = 'auto';
	tip.style.maxHeight = `${window.innerHeight - margin * 2}px`;
	tip.style.overflowY = 'auto';

	requestAnimationFrame(() => {
		const tipRect = tip.getBoundingClientRect();
		let left = slotRect.right + gap;
		let top = slotRect.top;

		if (left + tipRect.width > window.innerWidth - margin) {
			left = slotRect.left - tipRect.width - gap;
		}
		if (left < margin) {
			left = Math.max(margin, (window.innerWidth - tipRect.width) / 2);
		}

		if (top + tipRect.height > window.innerHeight - margin) {
			top = window.innerHeight - tipRect.height - margin;
		}
		if (top < margin) {
			top = margin;
		}

		tip.style.left = `${Math.round(left)}px`;
		tip.style.top = `${Math.round(top)}px`;
		tip.style.visibility = 'visible';
	});
}

// Hide tooltip
function hideTooltip(tip) {
	if (window.innerWidth <= 768) return;
	tip.style.position = '';
	tip.style.left = '';
	tip.style.right = '';
	tip.style.top = '';
	tip.style.bottom = '';
	tip.style.maxHeight = '';
	tip.style.overflowY = '';
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
			if (typeof applyInventoryResponse === 'function' && applyInventoryResponse(data)) {
				return;
			}
			loadInventoryData({ immediate: true });
		}
	};
}

window.showInventoryTooltip = showTooltip;
window.hideInventoryTooltip = hideTooltip;
window.applyInventoryResponse = applyInventoryResponse;
window.loadInventoryData = loadInventoryData;
