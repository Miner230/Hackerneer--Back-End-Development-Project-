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
let currentEquippedDiceId = null;
const tooltipOriginalHosts = new WeakMap();

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

function isDiceItem(item) {
	return item?.m === 'equip_dice' || item?.mechanic === 'equip_dice';
}

function getDiceInstanceId(item) {
	return item?.id ?? item?.dice_instance_id;
}

function getEquippedDiceInstanceId(equippedDice) {
	return equippedDice?.id ?? equippedDice?.dice_instance_id ?? null;
}

function syncEquippedDiceIdFromResponse(data) {
	if (!data || !Object.prototype.hasOwnProperty.call(data, 'equippedDice')) return;
	currentEquippedDiceId = getEquippedDiceInstanceId(data.equippedDice);
}

function isEquippedInventoryItem(item) {
	if (!isDiceItem(item) || currentEquippedDiceId == null) return false;
	return Number(getDiceInstanceId(item)) === Number(currentEquippedDiceId);
}

function getItemLootId(item) {
	return item?.lid ?? item?.loot_id;
}

function getItemQuantity(item) {
	return Number(item?.q ?? item?.quantity) || 0;
}

function getItemName(item) {
	return item?.n ?? item?.name ?? 'Item';
}

function getItemRarity(item) {
	return item?.r ?? item?.rarity ?? 'Common';
}

function getItemMechanic(item) {
	return item?.m ?? item?.mechanic;
}

function filterInventoryByTab(items, tab) {
	if (tab === 'dice') {
		return items.filter((item) => isDiceItem(item));
	}
	if (tab === 'items') {
		return items.filter((item) => !isDiceItem(item));
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
		const url = `${currentUrl}/api/inventory/${getItemLootId(useItem)}`;
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
		const itemLootId = getItemLootId(item);
		const index = nextInventory.findIndex(
			(entry) => getItemLootId(entry) === itemLootId && !isDiceItem(entry)
		);
		if (getItemQuantity(item) <= 0) {
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
	syncEquippedDiceIdFromResponse(data);

	let applied = false;

	if (data.inventoryPatch) {
		cachedInventory = mergeInventoryPatch(cachedInventory, data.inventoryPatch);
		renderInventoryItems(cachedInventory);

		if (
			!Object.prototype.hasOwnProperty.call(data, 'equippedDice') &&
			window.lastEquippedDiceId &&
			typeof syncCraftingPanelFromResponse === 'function'
		) {
			const patchedEquipped = data.inventoryPatch.dice?.find(
				(die) => Number(die.id ?? die.dice_instance_id) === Number(window.lastEquippedDiceId)
			);
			if (patchedEquipped) {
				syncCraftingPanelFromResponse({ equippedDice: patchedEquipped });
			}
		}

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
	bindHoverTooltip(slot, tooltip);
	slot.addEventListener('click', () => {
		if (isDiceItem(item)) {
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
	syncEquippedDiceIdFromResponse(data);

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
		inventory.filter((i) => getItemQuantity(i) > 0 && !isEquippedInventoryItem(i)),
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
		.sort((a, b) => order[getItemRarity(b).toLowerCase()] - order[getItemRarity(a).toLowerCase()])
		.forEach((item) => {
			try {
				createInventorySlot(item, grid);
			} catch (error) {
				console.error('Failed to render inventory slot:', getItemName(item), error);
			}
		});
}

// Create a single inventory slot
function createInventorySlot(item, grid) {
	const rarity = `rarity-${getItemRarity(item).toLowerCase()}`;
	const isDice = isDiceItem(item);
	const itemName = getItemName(item);
	const slot = document.createElement('div');
	slot.className = `inventory-slot inventory-entry ${rarity}${isDice ? ' inventory-slot--dice' : ''}`;
	slot.dataset.name = itemName.toLowerCase();

	const img = document.createElement('img');
	const lootId = getItemLootId(item);
	img.src =
		isDice && typeof getDiceImageSrc === 'function'
			? getDiceImageSrc(item)
			: typeof getLootImageSrc === 'function'
				? getLootImageSrc(lootId)
				: `https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/items/L${lootId}.png`;
	img.alt = itemName;
	img.draggable = false;

	const count = document.createElement('div');
	count.className = 'inventory-count';
	count.textContent = `x${getItemQuantity(item)}`;

	const tooltip = buildTooltip(item, rarity);

	slot.appendChild(img);
	if (!isDice && getItemQuantity(item) > 1) slot.appendChild(count);
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
	tip.innerHTML =
		typeof buildInventoryTooltipHtml === 'function'
			? buildInventoryTooltipHtml(item)
			: `<div class="tooltip-title">${getItemName(item)}</div>`;
	return tip;
}

function mountTooltipOnBody(tip) {
	if (!tip || tip.parentElement === document.body) return;
	if (!tooltipOriginalHosts.has(tip)) {
		tooltipOriginalHosts.set(tip, tip.parentElement);
	}
	document.body.appendChild(tip);
}

function restoreTooltipHost(tip) {
	const host = tooltipOriginalHosts.get(tip);
	if (host && tip?.parentElement === document.body) {
		host.appendChild(tip);
	}
}

function bindHoverTooltip(slot, tooltip) {
	if (!slot || !tooltip) return;

	slot.addEventListener('mouseenter', () => showTooltip(tooltip, slot));
	slot.addEventListener('mouseleave', () => hideTooltip(tooltip));
}

// Position tooltip within the viewport
function showTooltip(tip, slot) {
	if (window.innerWidth <= 768 || !tip || !slot) return;

	const margin = 10;
	const gap = 8;
	const slotRect = slot.getBoundingClientRect();

	mountTooltipOnBody(tip);

	tip.style.display = 'block';
	tip.style.visibility = 'hidden';
	tip.style.position = 'fixed';
	tip.style.left = '0';
	tip.style.top = '0';
	tip.style.right = 'auto';
	tip.style.bottom = 'auto';
	tip.style.zIndex = '11000';
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
	if (window.innerWidth <= 768 || !tip) return;
	tip.style.position = '';
	tip.style.left = '';
	tip.style.right = '';
	tip.style.top = '';
	tip.style.bottom = '';
	tip.style.zIndex = '';
	tip.style.maxHeight = '';
	tip.style.overflowY = '';
	tip.style.visibility = '';
	tip.style.display = 'none';
	restoreTooltipHost(tip);
}

// Open overlay for item use confirmation
function openUseOverlay(item) {
	document.getElementById('useItemTitle').textContent = `Use "${getItemName(item)}"?`;
	document.getElementById('useItemDesc').textContent =
		item.d || item.stat_description || 'Are you sure you want to use this item?';
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
window.bindHoverTooltip = bindHoverTooltip;
window.applyInventoryResponse = applyInventoryResponse;
window.loadInventoryData = loadInventoryData;
