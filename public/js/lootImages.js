const LOOT_ASSET_BASE =
	'https://raw.githubusercontent.com/Miner230/ca2-images/refs/heads/main/items/';

// Perfect Essence of fear — reuse for loot rows without a dedicated sprite in ca2-images.
const FALLBACK_LOOT_SPRITE_ID = 10;

const KNOWN_LOOT_SPRITE_IDS = new Set(
	Array.from({ length: 48 }, (_, index) => index + 1)
);

function hasLootSprite(lootId) {
	return KNOWN_LOOT_SPRITE_IDS.has(Number(lootId));
}

function getLootImageSrc(lootId) {
	const id = Number(lootId);
	const spriteId = hasLootSprite(id) ? id : FALLBACK_LOOT_SPRITE_ID;
	return `${LOOT_ASSET_BASE}L${spriteId}.png`;
}

window.LOOT_ASSET_BASE = LOOT_ASSET_BASE;
window.FALLBACK_LOOT_SPRITE_ID = FALLBACK_LOOT_SPRITE_ID;
window.hasLootSprite = hasLootSprite;
window.getLootImageSrc = getLootImageSrc;
