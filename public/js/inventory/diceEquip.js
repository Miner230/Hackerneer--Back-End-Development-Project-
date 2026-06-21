const DICE_ASSET_BASE = '/assets/dice/';

function getDiceImageSrc(item) {
	if (item?.ik || item?.image_key) {
		return `${DICE_ASSET_BASE}${item.ik || item.image_key}.png`;
	}
	const lootId = item?.lid ?? item?.loot_id ?? item?.id;
	if (typeof getLootImageSrc === 'function') {
		return getLootImageSrc(lootId);
	}
	return `https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/items/L${lootId}.png`;
}

function getEquippedDiceName(equippedDice) {
	return equippedDice?.cn || equippedDice?.crafted_name || equippedDice?.n || equippedDice?.name;
}

function getEquippedDiceLevel(equippedDice) {
	return Number(equippedDice?.il ?? equippedDice?.item_level) || 1;
}

function getEquippedDiceFlatDamage(equippedDice) {
	if (typeof formatEquippedFlatDamageDisplay === 'function') {
		return formatEquippedFlatDamageDisplay(equippedDice);
	}
	return equippedDice?.flat || equippedDice?.flat_damage_display || '';
}

function getDiceInstanceId(item) {
	return item?.id ?? item?.dice_instance_id;
}

function renderDiceCraftHeader(equippedDice) {
	const header = document.getElementById('diceCraftHeader');
	if (!header) return;

	if (!equippedDice) {
		header.innerHTML = '';
		return;
	}

	const flatDisplay = getEquippedDiceFlatDamage(equippedDice);
	const flatHtml = flatDisplay ? `<div class="equipped-dice-flat">${flatDisplay}</div>` : '';

	header.innerHTML = `
		<div class="equipped-dice-name">${getEquippedDiceName(equippedDice)}</div>
		<div class="equipped-dice-level">Item Level ${getEquippedDiceLevel(equippedDice)}</div>
		${flatHtml}
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

	const rarity = (equippedDice.r ?? equippedDice.rarity ?? 'common').toLowerCase();
	slot.classList.add(`rarity-${rarity}`);

	const img = document.createElement('img');
	img.src = getDiceImageSrc(equippedDice);
	img.alt = getEquippedDiceName(equippedDice);
	img.className = 'equipped-dice-image';
	img.draggable = false;

	slot.appendChild(img);

	if (typeof bindDieDropTarget === 'function') {
		bindDieDropTarget(slot, getDiceInstanceId(equippedDice));
	}

	unequipBtn.classList.remove('d-none');
}

function renderEquippedDicePanel(equippedDice) {
	if (equippedDice) {
		window.lastEquippedDiceId = getDiceInstanceId(equippedDice);
	} else {
		window.lastEquippedDiceId = null;
	}

	renderDiceCraftHeader(equippedDice);
	renderEquippedDiceCenter(equippedDice);

	if (typeof syncCraftingBoard === 'function') {
		syncCraftingBoard(equippedDice);
	}
}

function openEquipOverlay(item) {
	const itemName = item.n || item.name;
	document.getElementById('equipDiceTitle').textContent = `Equip "${itemName}"?`;
	document.getElementById('equipDiceDesc').textContent =
		item.d || item.stat_description || 'Equip this die for your next delve.';
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
			if (typeof applyInventoryResponse === 'function') {
				applyInventoryResponse(data);
			} else if (typeof syncCraftingPanelFromResponse === 'function') {
				syncCraftingPanelFromResponse(data);
				loadInventoryData();
			}
		}
	};

	fetchMethod(
		`${currentUrl}/api/inventory/dice/${getDiceInstanceId(item)}/equip`,
		callback,
		'PUT',
		null,
		token
	);
}

function unequipDice() {
	const callback = (status, data) => {
		showNotif({ status, message: data.message });
		if (status === 200) {
			if (typeof applyInventoryResponse === 'function') {
				applyInventoryResponse(data);
			} else if (typeof syncCraftingPanelFromResponse === 'function') {
				syncCraftingPanelFromResponse(data);
				loadInventoryData();
			}
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
