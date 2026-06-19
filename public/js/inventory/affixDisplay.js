const AFFIX_META = {
	crit_chance: { affixType: 'suffix', flavor: 'of Dread', stat: 'Critical Chance' },
	crit_power: { affixType: 'suffix', flavor: 'of the Chase', stat: 'Critical Power' },
	duplication_chance: { affixType: 'suffix', flavor: 'of the Mind', stat: 'Duplication Chance' },
	duplication_number: { affixType: 'suffix', flavor: 'of Echoes', stat: 'Duplication Number' },
	dice_flat_damage_percent: { affixType: 'prefix', flavor: 'Mighty', stat: 'Increased Flat Damage %' },
	dice_flat_damage_roll: { affixType: 'prefix', flavor: 'Edged', stat: 'Flat Damage per Roll' },
	face_1: { affixType: 'prefix', flavor: 'Weighted I', stat: 'Side 1 Weight' },
	face_2: { affixType: 'prefix', flavor: 'Weighted II', stat: 'Side 2 Weight' },
	face_3: { affixType: 'prefix', flavor: 'Weighted III', stat: 'Side 3 Weight' },
	face_4: { affixType: 'prefix', flavor: 'Weighted IV', stat: 'Side 4 Weight' },
	face_5: { affixType: 'prefix', flavor: 'Weighted V', stat: 'Side 5 Weight' },
	face_6: { affixType: 'prefix', flavor: 'Weighted VI', stat: 'Side 6 Weight' },
	player_flat_health: { affixType: 'suffix', flavor: 'of Vigor', stat: 'Max Health' },
	player_max_health_percent: { affixType: 'suffix', flavor: 'of Fortitude', stat: 'Max Health %' },
	damage_reduction_penetration: { affixType: 'prefix', flavor: 'Sundering', stat: 'DR Penetration' },
	player_life_regen: { affixType: 'suffix', flavor: 'of Renewal', stat: 'Life Regen' },
	player_speed_bonus: { affixType: 'suffix', flavor: 'of the Haste', stat: 'Combat Speed' },
};

const ESSENCE_STATLINE_MULTIPLIER = 3;

const RARITY_TIER_INDEX = {
	Common: 0,
	Uncommon: 1,
	Rare: 2,
	Epic: 3,
	Legendary: 4,
};

const CRAFTABLE_MECHANICS = new Set([
	'crit_chance',
	'crit_power',
	'duplication_chance',
	'duplication_number',
	'dice_flat_damage_percent',
	'dice_flat_damage_roll',
	'player_flat_health',
	'player_max_health_percent',
	'damage_reduction_penetration',
	'player_life_regen',
	'player_speed_bonus',
]);

const SOCKETABLE_MECHANICS = new Set([
	'face_1',
	'face_2',
	'face_3',
	'face_4',
	'face_5',
	'face_6',
]);

function isCraftableItem(item) {
	return CRAFTABLE_MECHANICS.has(item?.mechanic);
}

function isSocketableItem(item) {
	return SOCKETABLE_MECHANICS.has(item?.mechanic);
}

function getEffectiveCraftStatline(item) {
	const base = Math.max(1, Number(item?.statline) || 1);
	if (isCraftableItem(item)) {
		return Math.max(1, Math.floor(base * ESSENCE_STATLINE_MULTIPLIER));
	}
	return base;
}

const EDGE_FLAT_DAMAGE_RANGES = {
	Common: { min: 1, max: 3 },
	Uncommon: { min: 1, max: 6 },
	Rare: { min: 5, max: 15 },
	Epic: { min: 20, max: 60 },
	Legendary: { min: 130, max: 150 },
};

function normalizeRarityKey(rarity) {
	const key = String(rarity || 'Common');
	if (RARITY_TIER_INDEX[key] !== undefined) return key;
	const normalized = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
	return RARITY_TIER_INDEX[normalized] !== undefined ? normalized : 'Common';
}

function getEdgeFlatDamageRange(rarity) {
	return EDGE_FLAT_DAMAGE_RANGES[normalizeRarityKey(rarity)] || EDGE_FLAT_DAMAGE_RANGES.Common;
}

function formatFlatDamageRange(min, max) {
	const low = Number(min || 0);
	const high = Number(max || 0);
	if (high <= 0) return '0';
	return `+${low}-${high}`;
}

function getModifierRollRange(item) {
	if (item?.mechanic === 'dice_flat_damage_roll') {
		return getEdgeFlatDamageRange(item.rarity);
	}

	const max = getEffectiveCraftStatline(item);
	const tier = RARITY_TIER_INDEX[normalizeRarityKey(item?.rarity)] ?? 0;
	const min = Math.max(1, Math.floor(max * (0.35 + tier * 0.13)));
	return { min, max };
}

function formatRollRangeText(item) {
	const { min, max } = getModifierRollRange(item);
	return `${min} – ${max}`;
}

function formatFixedValueText(item) {
	const value = Math.max(1, Number(item?.statline ?? item?.rolled_value) || 1);
	return `+${value}`;
}

function formatModifierValueText(modifier) {
	const value = Number(modifier.rolled_value || 0);
	if (modifier.essence_mechanic === 'dice_flat_damage_percent') {
		return `+${value}%`;
	}
	if (modifier.essence_mechanic === 'dice_flat_damage_roll') {
		const range = getEdgeFlatDamageRange(modifier.source_rarity);
		return formatFlatDamageRange(range.min, range.max);
	}
	return `+${value}`;
}

function getAffixMeta(mechanic) {
	return AFFIX_META[mechanic] || null;
}

function getAffixTypeForMechanic(mechanic) {
	return getAffixMeta(mechanic)?.affixType || null;
}

function getAffixStatLabel(modifierOrMechanic) {
	const mechanic =
		typeof modifierOrMechanic === 'string'
			? modifierOrMechanic
			: modifierOrMechanic?.essence_mechanic;
	return getAffixMeta(mechanic)?.stat || mechanic?.replace(/_/g, ' ') || 'Unknown';
}

function getAffixFlavorName(modifierOrMechanic) {
	const mechanic =
		typeof modifierOrMechanic === 'string'
			? modifierOrMechanic
			: modifierOrMechanic?.essence_mechanic;
	return (
		getAffixMeta(mechanic)?.flavor ||
		modifierOrMechanic?.modifier_name ||
		mechanic?.replace(/_/g, ' ') ||
		''
	);
}

function getAffixRarityClass(sourceRarity) {
	const key = String(sourceRarity || 'Common').toLowerCase();
	if (['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(key)) {
		return `affix-row--rarity-${key}`;
	}
	return 'affix-row--rarity-common';
}

function formatAffixBadge(affixType) {
	if (affixType === 'prefix') {
		return '<span class="affix-badge affix-badge--prefix" title="Prefix">P</span>';
	}
	if (affixType === 'suffix') {
		return '<span class="affix-badge affix-badge--suffix" title="Suffix">S</span>';
	}
	return '';
}

function formatImplicitListItem(implicit) {
	return `<li class="affix-row affix-row--implicit">
		<div class="affix-row-main">
			<span class="affix-stat">${implicit.label}</span>
			<span class="affix-value">${implicit.display}</span>
		</div>
	</li>`;
}

function renderImplicitListHtml(implicits = [], emptyText = 'None') {
	if (!implicits.length) {
		return `<li class="affix-empty">${emptyText}</li>`;
	}
	return implicits.map(formatImplicitListItem).join('');
}

function formatEffectiveStatListItem(stat) {
	return `<li class="affix-row affix-row--effective">
		<div class="affix-row-main">
			<span class="affix-stat">${stat.label}</span>
			<span class="affix-value">${stat.display}</span>
		</div>
	</li>`;
}

function renderEffectiveStatListHtml(stats = [], emptyText = 'Equip a die to view stats') {
	if (!stats.length) {
		return `<li class="affix-empty">${emptyText}</li>`;
	}
	return stats.map(formatEffectiveStatListItem).join('');
}

function formatTooltipAffixListItem(modifier) {
	const affixType = modifier.affix_type || getAffixTypeForMechanic(modifier.essence_mechanic);
	const name = modifier.source_name || getAffixFlavorName(modifier);
	const stat = getAffixStatLabel(modifier);
	const valueText = formatModifierValueText(modifier);
	const rarityClass = getAffixRarityClass(modifier.source_rarity);

	return `<li class="affix-row affix-row--${affixType} ${rarityClass}">
		<div class="affix-row-main">
			<span class="affix-stat">${name}</span>
			<span class="affix-value">${valueText}</span>
		</div>
		<span class="affix-flavor">${stat}</span>
	</li>`;
}

function renderTooltipAffixListHtml(modifiers = [], emptyText = 'None') {
	if (!modifiers.length) {
		return `<li class="affix-empty">${emptyText}</li>`;
	}
	return modifiers.map(formatTooltipAffixListItem).join('');
}

function formatAffixListItem(modifier) {
	const affixType = modifier.affix_type || getAffixTypeForMechanic(modifier.essence_mechanic);
	const stat = getAffixStatLabel(modifier);
	const flavor = getAffixFlavorName(modifier);
	const valueText = formatModifierValueText(modifier);
	const rarityClass = getAffixRarityClass(modifier.source_rarity);

	return `<li class="affix-row affix-row--${affixType} ${rarityClass}">
		<div class="affix-row-main">
			<span class="affix-stat">${stat}</span>
			<span class="affix-value">${valueText}</span>
		</div>
		<span class="affix-flavor">${flavor}</span>
	</li>`;
}

function renderAffixListHtml(modifiers = [], emptyText = 'None') {
	if (!modifiers.length) {
		return `<li class="affix-empty">${emptyText}</li>`;
	}
	return modifiers.map(formatAffixListItem).join('');
}

function formatSocketListItem(socket) {
	const name = socket.source_name || 'Weighting Stone';
	const value = Number(socket.rolled_value || 0);
	const faceLabel = getAffixStatLabel(socket.mechanic);
	const rarityClass = getAffixRarityClass(socket.source_rarity);

	return `<li class="affix-row affix-row--socket ${rarityClass}">
		<div class="affix-row-main">
			<span class="affix-stat">${name}</span>
			<span class="affix-value">+${value}</span>
		</div>
		<span class="affix-flavor">${faceLabel}</span>
	</li>`;
}

function renderSocketListHtml(sockets = [], socketCount = 0, emptyText = 'No sockets') {
	const totalSockets = Math.max(0, Number(socketCount) || 0);
	if (totalSockets <= 0) {
		return `<li class="affix-empty">${emptyText}</li>`;
	}

	const filled = (sockets || []).map(formatSocketListItem).join('');
	const openCount = Math.max(0, totalSockets - (sockets?.length || 0));
	const openHtml = openCount
		? `<li class="affix-empty affix-empty--socket">${openCount} open socket${openCount > 1 ? 's' : ''}</li>`
		: '';

	return `${filled}${openHtml}`;
}

function buildSocketedItemTooltip(socket) {
	const tip = document.createElement('div');
	const rarity = `rarity-${(socket.source_rarity || 'common').toLowerCase()}`;
	tip.className = `tooltip-box ${rarity}`;

	const name = socket.source_name || 'Weighting Stone';
	const statLabel = getAffixStatLabel(socket.mechanic);
	const statLine = socket.source_stat_description || '';
	const value = Number(socket.rolled_value ?? socket.source_statline ?? 0);

	tip.innerHTML = `
		<div class="tooltip-title">${name}</div>
		<div class="tooltip-stat">${statLabel}</div>
		${statLine ? `<div class="tooltip-stat">${statLine}</div>` : ''}
		<div class="tooltip-stat tooltip-fixed-value">+${value}</div>
		<div class="tooltip-rarity">${socket.source_rarity || ''}</div>
	`;

	return tip;
}

function appendAffixBadgeToSlot(slot, mechanic) {
	const affixType = getAffixTypeForMechanic(mechanic);
	if (!affixType) return;

	slot.classList.add(`inventory-slot--${affixType}`);
	const badge = document.createElement('span');
	badge.className = `affix-slot-badge affix-slot-badge--${affixType}`;
	badge.textContent = affixType === 'prefix' ? 'P' : 'S';
	badge.title = affixType === 'prefix' ? 'Prefix essence' : 'Suffix essence';
	slot.appendChild(badge);
}

window.getModifierRollRange = getModifierRollRange;
window.formatRollRangeText = formatRollRangeText;
window.formatFixedValueText = formatFixedValueText;
window.buildSocketedItemTooltip = buildSocketedItemTooltip;
window.isCraftableItem = isCraftableItem;
window.isSocketableItem = isSocketableItem;
window.getAffixMeta = getAffixMeta;
window.getAffixTypeForMechanic = getAffixTypeForMechanic;
window.getAffixStatLabel = getAffixStatLabel;
window.getAffixFlavorName = getAffixFlavorName;
window.formatAffixBadge = formatAffixBadge;
window.formatImplicitListItem = formatImplicitListItem;
window.renderImplicitListHtml = renderImplicitListHtml;
window.renderEffectiveStatListHtml = renderEffectiveStatListHtml;
window.formatAffixListItem = formatAffixListItem;
window.renderAffixListHtml = renderAffixListHtml;
window.renderTooltipAffixListHtml = renderTooltipAffixListHtml;
window.renderSocketListHtml = renderSocketListHtml;
window.appendAffixBadgeToSlot = appendAffixBadgeToSlot;
