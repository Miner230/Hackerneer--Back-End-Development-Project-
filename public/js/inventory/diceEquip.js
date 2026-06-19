const DICE_ASSET_BASE = '/assets/dice/';

function getDiceImageSrc(item) {
	if (item?.image_key) {
		return `${DICE_ASSET_BASE}${item.image_key}.png`;
	}
	if (typeof getLootImageSrc === 'function') {
		return getLootImageSrc(item.loot_id || item.id);
	}
	return `https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/items/L${item.loot_id || item.id}.png`;
}

function renderDiceCraftHeader(equippedDice) {
	const header = document.getElementById('diceCraftHeader');
	if (!header) return;

	if (!equippedDice) {
		header.innerHTML = '';
		return;
	}

	header.innerHTML = `
		<div class="equipped-dice-name">${equippedDice.crafted_name || equippedDice.name}</div>
		<div class="equipped-dice-level">Item Level ${equippedDice.item_level || 1}</div>
	`;
}

function resetEquippedDiceSlotElement() {
	const slot = document.getElementById('equippedDiceSlot');
	if (!slot?.parentNode) return slot;

	const freshSlot = document.createElement('div');
	freshSlot.id = 'equippedDiceSlot';
	freshSlot.className = 'equipped-dice-slot';
	freshSlot.setAttribute('aria-label', slot.getAttribute('aria-label') || 'Equipped dice');
	slot.parentNode.replaceChild(freshSlot, slot);
	return freshSlot;
}

function renderEquippedDiceCenter(equippedDice) {
	const slot = resetEquippedDiceSlotElement();
	const unequipBtn = document.getElementById('unequipDiceBtn');
	if (!slot || !unequipBtn) return;

	if (!equippedDice) {
		slot.classList.add('rarity-common');
		slot.innerHTML =
			'<span class="equipped-dice-empty">No dice equipped</span><span class="equipped-dice-hint">Drag essences onto the die · stones into sockets</span>';
		unequipBtn.classList.add('d-none');
		return;
	}

	const rarity = (equippedDice.rarity || 'common').toLowerCase();
	slot.classList.add(`rarity-${rarity}`);

	const img = document.createElement('img');
	img.src = getDiceImageSrc(equippedDice);
	img.alt = equippedDice.name;
	img.className = 'equipped-dice-image';
	img.draggable = false;

	slot.appendChild(img);

	if (typeof bindDieDropTarget === 'function') {
		bindDieDropTarget(slot, equippedDice.dice_instance_id);
	}

	unequipBtn.classList.remove('d-none');
}

function renderEquippedDicePanel(equippedDice) {
	renderDiceCraftHeader(equippedDice);
	renderEquippedDiceCenter(equippedDice);

	if (typeof syncCraftingBoard === 'function') {
		syncCraftingBoard(equippedDice);
	}
}

function openEquipOverlay(item) {
	document.getElementById('equipDiceTitle').textContent = `Equip "${item.name}"?`;
	document.getElementById('equipDiceDesc').textContent =
		item.stat_description || 'Equip this die for your next delve.';
	document.getElementById('confirmEquipBtn').dataset.item = JSON.stringify(item);
	document.getElementById('equipDiceOverlay').classList.remove('d-none');
}

function closeEquipOverlay() {
	document.getElementById('equipDiceOverlay').classList.add('d-none');
}

function confirmEquipDice() {
	const confirmBtn = document.getElementById('confirmEquipBtn');
	const item = confirmBtn.dataset.item ? JSON.parse(confirmBtn.dataset.item) : null;
	if (!item) return;

	const callback = (status, data) => {
		showNotif({ status, message: data.message });
		if (status === 200) {
			closeEquipOverlay();
			if (typeof syncCraftingPanelFromResponse === 'function') {
				syncCraftingPanelFromResponse(data);
			}
			loadInventoryData();
		}
	};

	fetchMethod(`${currentUrl}/api/inventory/dice/${item.dice_instance_id}/equip`, callback, 'PUT', null, token);
}

function unequipDice() {
	const callback = (status, data) => {
		showNotif({ status, message: data.message });
		if (status === 200) {
			if (typeof syncCraftingPanelFromResponse === 'function') {
				syncCraftingPanelFromResponse(data);
			}
			loadInventoryData();
		}
	};

	fetchMethod(`${currentUrl}/api/inventory/dice/unequip`, callback, 'PUT', null, token);
}

document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('confirmEquipBtn')?.addEventListener('click', confirmEquipDice);
	document.getElementById('cancelEquipBtn')?.addEventListener('click', closeEquipOverlay);
	document.getElementById('unequipDiceBtn')?.addEventListener('click', unequipDice);
});

window.renderEquippedDicePanel = renderEquippedDicePanel;
window.openEquipOverlay = openEquipOverlay;
window.getDiceImageSrc = getDiceImageSrc;
