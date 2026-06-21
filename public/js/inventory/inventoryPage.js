const INVENTORY_FULLSCREEN_CLASS = 'inventory-fullscreen';
const INVENTORY_ARENA_ID = 'inventoryArena';

function exitInventory() {
	GameFullscreen.navigateTo('world.html');
}

function initInventoryPage() {
	const exitBtn = document.getElementById('exitInventoryBtn');
	if (exitBtn) exitBtn.addEventListener('click', exitInventory);

	bindPageFullscreen({
		bodyClass: INVENTORY_FULLSCREEN_CLASS,
		arenaId: INVENTORY_ARENA_ID,
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initInventoryPage);
} else {
	initInventoryPage();
}
