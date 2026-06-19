let pendingEssenceLootId = null;
let craftRequestInFlight = false;

function getEquippedDiceId(equippedDice) {
	return equippedDice?.id ?? equippedDice?.dice_instance_id;
}

function getEquippedSocketCount(equippedDice) {
	return Math.max(0, Number(equippedDice?.sc ?? equippedDice?.socket_count) || 0);
}

function getEquippedSockets(equippedDice) {
	const raw = equippedDice?.socks || equippedDice?.sockets || [];
	return raw.map((entry) =>
		typeof expandSocketTuple === 'function' ? expandSocketTuple(entry) : entry
	);
}

function applyEssenceToDie(diceInstanceId, essenceLootId = pendingEssenceLootId) {
	if (!essenceLootId) {
		showNotif({ status: 400, message: 'Select an essence first, then drop it on a die.' });
		return;
	}
	if (craftRequestInFlight) return;

	craftRequestInFlight = true;

	const callback = (status, data) => {
		craftRequestInFlight = false;
		showNotif({ status, message: data.message });
		if (status === 200) {
			pendingEssenceLootId = null;
			if (typeof applyInventoryResponse === 'function') {
				applyInventoryResponse(data);
			} else {
				syncCraftingPanelFromResponse(data);
				loadInventoryData();
			}
		}
	};

	fetchMethod(
		`${currentUrl}/api/inventory/dice/craft`,
		callback,
		'PUT',
		{ essenceLootId, diceInstanceId },
		token
	);
}

function applySocketItemToDie(diceInstanceId, lootId) {
	if (!lootId) {
		showNotif({ status: 400, message: 'Select a weighting stone first, then drop it into a socket.' });
		return;
	}
	if (craftRequestInFlight) return;

	craftRequestInFlight = true;

	const callback = (status, data) => {
		craftRequestInFlight = false;
		showNotif({ status, message: data.message });
		if (status === 200) {
			if (typeof applyInventoryResponse === 'function') {
				applyInventoryResponse(data);
			} else {
				syncCraftingPanelFromResponse(data);
				loadInventoryData();
			}
		}
	};

	fetchMethod(
		`${currentUrl}/api/inventory/dice/socket`,
		callback,
		'PUT',
		{ lootId, diceInstanceId },
		token
	);
}

function isDropTargetBound(element) {
	return element?.dataset?.dropTargetBound === 'true';
}

function markDropTargetBound(element) {
	element.dataset.dropTargetBound = 'true';
}

function handleDieDrop(event, element) {
	event.preventDefault();
	event.stopPropagation();
	element.classList.remove('dice-drop-target--hover');

	const targetDiceInstanceId = Number(element.dataset.diceInstanceId);
	if (!targetDiceInstanceId) return;

	const essenceLootId = Number(event.dataTransfer.getData('text/essence-loot-id'));
	if (essenceLootId) {
		applyEssenceToDie(targetDiceInstanceId, essenceLootId);
		return;
	}

	const socketLootId = Number(event.dataTransfer.getData('text/socket-loot-id'));
	if (socketLootId) {
		applySocketItemToDie(targetDiceInstanceId, socketLootId);
	}
}

function bindDieDropTarget(element, diceInstanceId) {
	if (!element || !diceInstanceId) return;

	element.dataset.diceInstanceId = String(diceInstanceId);
	element.classList.add('dice-drop-target');

	if (isDropTargetBound(element)) return;
	markDropTargetBound(element);

	element.addEventListener('dragover', (event) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
		element.classList.add('dice-drop-target--hover');
	});

	element.addEventListener('dragleave', () => {
		element.classList.remove('dice-drop-target--hover');
	});

	element.addEventListener('drop', (event) => handleDieDrop(event, element));
}

function bindEssenceDropTarget(element, diceInstanceId) {
	bindDieDropTarget(element, diceInstanceId);
}

function bindSocketDropTarget(element, diceInstanceId) {
	if (!element || !diceInstanceId) return;

	element.dataset.diceInstanceId = String(diceInstanceId);
	element.classList.add('dice-socket-drop-target');

	if (isDropTargetBound(element)) return;
	markDropTargetBound(element);

	element.addEventListener('dragover', (event) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
		element.classList.add('dice-socket-drop-target--hover');
	});

	element.addEventListener('dragleave', () => {
		element.classList.remove('dice-socket-drop-target--hover');
	});

	element.addEventListener('drop', (event) => {
		event.preventDefault();
		event.stopPropagation();
		element.classList.remove('dice-socket-drop-target--hover');
		const targetDiceInstanceId = Number(element.dataset.diceInstanceId);
		const socketLootId = Number(event.dataTransfer.getData('text/socket-loot-id'));
		if (!targetDiceInstanceId || !socketLootId) return;
		applySocketItemToDie(targetDiceInstanceId, socketLootId);
	});
}

function clearDieDropTarget(element) {
	if (!element) return;
	delete element.dataset.diceInstanceId;
	delete element.dataset.dropTargetBound;
	delete element.dataset.essenceDropBound;
	delete element.dataset.socketDropBound;
	delete element.dataset.dieDropBound;
	element.classList.remove(
		'dice-drop-target',
		'dice-drop-target--essence',
		'dice-drop-target--hover',
		'dice-socket-drop-target',
		'dice-socket-drop-target--hover'
	);
}

function getSocketColumnSplit(socketCount) {
	const total = Math.max(0, Number(socketCount) || 0);
	const leftCount = Math.min(3, Math.ceil(total / 2));
	return { leftCount, rightCount: total - leftCount };
}

function createFilledSocketSlot(socket) {
	const rarity = (socket.source_rarity || 'common').toLowerCase();
	const slot = document.createElement('div');
	slot.className = `dice-socket-slot dice-socket-slot--filled rarity-${rarity}`;

	const img = document.createElement('img');
	img.src =
		typeof getLootImageSrc === 'function'
			? getLootImageSrc(socket.source_loot_id)
			: `https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/items/L${socket.source_loot_id}.png`;
	img.alt = socket.source_name || 'Socketed item';
	img.className = 'dice-socket-item-image';
	img.draggable = false;

	slot.appendChild(img);

	if (typeof buildSocketedItemTooltip === 'function') {
		const tooltip = buildSocketedItemTooltip(socket);
		slot.appendChild(tooltip);
		slot.addEventListener('mouseenter', () => {
			if (typeof showInventoryTooltip === 'function') {
				showInventoryTooltip(tooltip, slot);
			}
		});
		slot.addEventListener('mouseleave', () => {
			if (typeof hideInventoryTooltip === 'function') {
				hideInventoryTooltip(tooltip);
			}
		});
	}

	return slot;
}

function createEmptySocketSlot(diceInstanceId) {
	const slot = document.createElement('div');
	slot.className = 'dice-socket-slot dice-socket-slot--empty';
	slot.setAttribute('aria-label', 'Empty socket');
	slot.innerHTML = '<span class="dice-socket-slot-glyph" aria-hidden="true">◆</span>';
	bindSocketDropTarget(slot, diceInstanceId);
	return slot;
}

function renderSocketSlots(equippedDice) {
	const leftColumn = document.getElementById('diceSocketColumnLeft');
	const rightColumn = document.getElementById('diceSocketColumnRight');
	if (!leftColumn || !rightColumn) return;

	leftColumn.innerHTML = '';
	rightColumn.innerHTML = '';

	const diceInstanceId = getEquippedDiceId(equippedDice);
	if (!diceInstanceId) return;

	const socketCount = getEquippedSocketCount(equippedDice);
	if (socketCount <= 0) return;

	const socketsByIndex = new Map();
	getEquippedSockets(equippedDice).forEach((socket) => {
		socketsByIndex.set(Number(socket.slot_index), socket);
	});

	const { leftCount, rightCount } = getSocketColumnSplit(socketCount);

	for (let index = 0; index < leftCount; index += 1) {
		const socket = socketsByIndex.get(index);
		leftColumn.appendChild(
			socket ? createFilledSocketSlot(socket) : createEmptySocketSlot(diceInstanceId)
		);
	}

	for (let index = leftCount; index < leftCount + rightCount; index += 1) {
		const socket = socketsByIndex.get(index);
		rightColumn.appendChild(
			socket ? createFilledSocketSlot(socket) : createEmptySocketSlot(diceInstanceId)
		);
	}
}

function clearSocketSlots() {
	const leftColumn = document.getElementById('diceSocketColumnLeft');
	const rightColumn = document.getElementById('diceSocketColumnRight');
	if (leftColumn) leftColumn.innerHTML = '';
	if (rightColumn) rightColumn.innerHTML = '';
}

function bindCraftableInventorySlot(slot, item) {
	if (!isCraftableItem(item)) return;

	const lootId = item.lid ?? item.loot_id;
	const mechanic = item.m ?? item.mechanic;

	slot.draggable = true;
	slot.classList.add('inventory-slot--craftable');
	if (typeof appendAffixBadgeToSlot === 'function') {
		appendAffixBadgeToSlot(slot, mechanic);
	}

	slot.addEventListener('dragstart', (event) => {
		pendingEssenceLootId = lootId;
		const lootIdText = String(lootId);
		event.dataTransfer.setData('text/essence-loot-id', lootIdText);
		event.dataTransfer.setData('text/plain', lootIdText);
		event.dataTransfer.effectAllowed = 'copy';
		slot.classList.add('inventory-slot--dragging');
	});

	slot.addEventListener('dragend', () => {
		slot.classList.remove('inventory-slot--dragging');
	});
}

function bindSocketableInventorySlot(slot, item) {
	if (!isSocketableItem(item)) return;

	const lootId = item.lid ?? item.loot_id;

	slot.draggable = true;
	slot.classList.add('inventory-slot--socketable');

	slot.addEventListener('dragstart', (event) => {
		const lootIdText = String(lootId);
		event.dataTransfer.setData('text/socket-loot-id', lootIdText);
		event.dataTransfer.setData('text/plain', lootIdText);
		event.dataTransfer.effectAllowed = 'copy';
		slot.classList.add('inventory-slot--dragging');
	});

	slot.addEventListener('dragend', () => {
		slot.classList.remove('inventory-slot--dragging');
	});
}

function bindDiceInventorySlot(slot, item) {
	if (item.m !== 'equip_dice' && item.mechanic !== 'equip_dice') return;
	slot.classList.add('dice-drop-target');
	bindDieDropTarget(slot, item.id ?? item.dice_instance_id);
}

function renderImplicitList(implicits = []) {
	const implicitList = document.getElementById('diceImplicitList');
	if (!implicitList || typeof window.renderImplicitListHtml !== 'function') return;
	implicitList.innerHTML = window.renderImplicitListHtml(implicits, 'No implicits');
}

function renderAffixLists(equippedDice) {
	const prefixList = document.getElementById('dicePrefixList');
	const suffixList = document.getElementById('diceSuffixList');
	if (!prefixList || !suffixList) return;

	const pre = equippedDice?.pre || [];
	const suf = equippedDice?.suf || [];

	if (typeof window.renderTuplePanelListHtml === 'function') {
		prefixList.innerHTML = window.renderTuplePanelListHtml(pre, 'No prefixes');
		suffixList.innerHTML = window.renderTuplePanelListHtml(suf, 'No suffixes');
		return;
	}

	if (typeof window.renderAffixListHtml !== 'function') return;

	const modifiers = equippedDice?.modifiers || [];
	const prefixes = modifiers.filter((modifier) => modifier.affix_type === 'prefix');
	const suffixes = modifiers.filter((modifier) => modifier.affix_type === 'suffix');
	prefixList.innerHTML = window.renderAffixListHtml(prefixes, 'No prefixes');
	suffixList.innerHTML = window.renderAffixListHtml(suffixes, 'No suffixes');
}

function syncCraftingPanelFromResponse(data) {
	if (!data || !Object.prototype.hasOwnProperty.call(data, 'equippedDice')) return;
	if (typeof renderEquippedDicePanel !== 'function') return;
	renderEquippedDicePanel(data.equippedDice || null);
}

function syncCraftingBoard(equippedDice) {
	renderImplicitList(equippedDice?.imp || equippedDice?.implicits || []);
	renderAffixLists(equippedDice);
	renderSocketSlots(equippedDice);
}

window.bindEssenceDropTarget = bindEssenceDropTarget;
window.bindSocketDropTarget = bindSocketDropTarget;
window.bindDieDropTarget = bindDieDropTarget;
window.clearDieDropTarget = clearDieDropTarget;
window.bindCraftableInventorySlot = bindCraftableInventorySlot;
window.bindSocketableInventorySlot = bindSocketableInventorySlot;
window.bindDiceInventorySlot = bindDiceInventorySlot;
window.renderImplicitList = renderImplicitList;
window.syncCraftingPanelFromResponse = syncCraftingPanelFromResponse;
window.syncCraftingBoard = syncCraftingBoard;
window.renderAffixLists = renderAffixLists;
window.renderSocketSlots = renderSocketSlots;
window.clearSocketSlots = clearSocketSlots;
