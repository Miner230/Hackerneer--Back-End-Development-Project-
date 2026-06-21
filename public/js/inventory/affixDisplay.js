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

function getItemMechanic(item) {
	return item?.m ?? item?.mechanic;
}

function isCraftableItem(item) {
	return CRAFTABLE_MECHANICS.has(getItemMechanic(item));
}

function isSocketableItem(item) {
	return SOCKETABLE_MECHANICS.has(getItemMechanic(item));
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
	const rollTier =
		typeof getModifierRollTier === 'function' ? getModifierRollTier(sourceRarity) : null;
	if (rollTier != null) {
		return `affix-row--tier-${getModifierTierCssKey(rollTier)}`;
	}

	const key = String(sourceRarity || 'Common').toLowerCase();
	if (['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(key)) {
		return `affix-row--rarity-${key}`;
	}
	return 'affix-row--rarity-common';
}

function getAffixModifierTierClass(modifierOrTier) {
	const rollTier =
		typeof modifierOrTier === 'number'
			? modifierOrTier
			: typeof getModifierRollTierFromModifier === 'function'
				? getModifierRollTierFromModifier(modifierOrTier)
				: null;

	if (rollTier == null) {
		return getAffixRarityClass(modifierOrTier?.source_rarity);
	}

	return `affix-row--tier-${getModifierTierCssKey(rollTier)}`;
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

function formatTuplePanelListItem(row, extraClass = '') {
	const affix = normalizeCraftedAffixRow(row);
	if (!affix) return '';

	const tierBadge =
		affix.rollTier != null && typeof formatModifierTierBadge === 'function'
			? formatModifierTierBadge(affix.rollTier)
			: '';
	const tierClass =
		affix.rollTier != null ? getAffixModifierTierClass(affix.rollTier) : extraClass;

	if (affix.source) {
		const sourceClass =
			affix.sourceKind === 'intrinsic' ? 'affix-flavor' : 'affix-source affix-source--essence';
		return `<li class="affix-row affix-row--crafted ${tierClass || extraClass}">
			<div class="affix-row-main">
				${tierBadge}
				<span class="affix-stat">${affix.stat}</span>
				<span class="affix-value">${affix.value}</span>
			</div>
			<span class="${sourceClass}">${affix.source}</span>
		</li>`;
	}

	return `<li class="affix-row ${tierClass || extraClass}">
		<div class="affix-row-main">
			${tierBadge}
			<span class="affix-stat">${affix.stat}</span>
			<span class="affix-value">${affix.value}</span>
		</div>
	</li>`;
}

function renderTuplePanelListHtml(rows = [], emptyText = 'None') {
	if (!rows?.length) {
		return `<li class="affix-empty">${emptyText}</li>`;
	}
	return rows.map((row) => formatTuplePanelListItem(row)).join('');
}

function formatImplicitListItem(implicit) {
	if (Array.isArray(implicit)) {
		return formatTuplePanelListItem(implicit, 'affix-row--implicit');
	}
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

function getModifierAffixSourceLabel(modifier) {
	if (modifier?.source_kind === 'crafted') {
		return modifier.source_name || getAffixFlavorName(modifier);
	}
	return getAffixFlavorName(modifier);
}

function formatTooltipAffixListItem(modifier) {
	const affixType = modifier.affix_type || getAffixTypeForMechanic(modifier.essence_mechanic);
	const name = getModifierAffixSourceLabel(modifier);
	const stat = getAffixStatLabel(modifier);
	const valueText = formatModifierValueText(modifier);
	const rollTier =
		typeof getModifierRollTierFromModifier === 'function'
			? getModifierRollTierFromModifier(modifier)
			: null;
	const tierBadge =
		rollTier != null && typeof formatModifierTierBadge === 'function'
			? formatModifierTierBadge(rollTier)
			: '';
	const tierClass = getAffixModifierTierClass(modifier);

	return `<li class="affix-row affix-row--${affixType} ${tierClass}">
		<div class="affix-row-main">
			${tierBadge}
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
	const rollTier =
		typeof getModifierRollTierFromModifier === 'function'
			? getModifierRollTierFromModifier(modifier)
			: null;
	const tierBadge =
		rollTier != null && typeof formatModifierTierBadge === 'function'
			? formatModifierTierBadge(rollTier)
			: '';
	const tierClass = getAffixModifierTierClass(modifier);

	return `<li class="affix-row affix-row--${affixType} ${tierClass}">
		<div class="affix-row-main">
			${tierBadge}
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
	const rollTier =
		typeof getModifierRollTierFromModifier === 'function'
			? getModifierRollTierFromModifier(socket)
			: null;
	const tierBadge =
		rollTier != null && typeof formatModifierTierBadge === 'function'
			? formatModifierTierBadge(rollTier)
			: '';
	const tierClass = getAffixModifierTierClass(socket);

	return `<li class="affix-row affix-row--socket ${tierClass}">
		<div class="affix-row-main">
			${tierBadge}
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

function inferAffixStatFromValue(value) {
	const text = String(value || '');
	if (text.includes('%')) return 'Flat Damage %';
	if (/\+?\d+\s*[-–]\s*\d+/.test(text)) return 'Flat Damage per Roll';
	return 'Bonus';
}

function normalizeCraftedAffixRow(row) {
	if (!Array.isArray(row) || row.length < 2) return null;

	if (row.length >= 5) {
		const sourceKind = row[3] === 'i' ? 'intrinsic' : row[3] === 'c' ? 'crafted' : null;
		return {
			stat: row[0],
			value: row[1],
			source: row[2],
			sourceKind,
			rollTier: row[4] != null && row[4] !== '' ? Number(row[4]) : null,
		};
	}

	if (row.length >= 3) {
		const sourceKind = row[3] === 'i' ? 'intrinsic' : row[3] === 'c' ? 'crafted' : null;
		return { stat: row[0], value: row[1], source: row[2], sourceKind, rollTier: null };
	}

	const [first, second] = row;
	if (String(second).includes('%') || /\+?\d+\s*[-–]\s*\d+/.test(String(second))) {
		return { stat: inferAffixStatFromValue(second), value: second, source: first, sourceKind: null, rollTier: null };
	}

	return { stat: first, value: second, source: null, sourceKind: null, rollTier: null };
}

function sumFlatDamagePercentFromAffixes(rows = []) {
	return rows.reduce((sum, row) => {
		const affix = normalizeCraftedAffixRow(row);
		if (!affix || !String(affix.value).includes('%')) return sum;
		if (affix.stat !== 'Flat Damage %' && affix.stat !== 'Increased Flat Damage %') return sum;
		const match = String(affix.value).match(/\+?(\d+)%/);
		return sum + (match ? Number(match[1]) : 0);
	}, 0);
}

function formatCraftedAffixTooltipItem(row) {
	const affix = normalizeCraftedAffixRow(row);
	if (!affix) return '';

	const tierBadge =
		affix.rollTier != null && typeof formatModifierTierBadge === 'function'
			? formatModifierTierBadge(affix.rollTier)
			: '';
	const sourceClass =
		affix.sourceKind === 'intrinsic'
			? 'tooltip-affix-flavor'
			: 'tooltip-affix-source tooltip-affix-source--essence';
	const sourceHtml = affix.source
		? `<span class="${sourceClass}">${affix.source}</span>`
		: '';

	return `<li class="tooltip-affix-compact tooltip-affix-compact--crafted">
		<div class="tooltip-affix-main">
			${tierBadge}
			<span class="tooltip-affix-stat">${affix.stat}</span>
			<span class="tooltip-affix-value">${affix.value}</span>
		</div>
		${sourceHtml}
	</li>`;
}

function renderCraftedAffixRowsHtml(rows = [], emptyText = 'None') {
	if (!rows?.length) {
		return `<li class="tooltip-affix-compact tooltip-affix-compact--empty">${emptyText}</li>`;
	}
	return rows.map(formatCraftedAffixTooltipItem).join('');
}

function renderCraftedAffixPanelHtml(label, rows) {
	if (!rows?.length) return '';
	return `<div class="tooltip-section-label">${label}</div><ul class="tooltip-affix-list">${renderCraftedAffixRowsHtml(rows)}</ul>`;
}

function formatEquippedFlatDamageDisplay(equippedDice) {
	let flat = equippedDice?.flat || equippedDice?.flat_damage_display || '';
	const fdp = Number(equippedDice?.fdp) || sumFlatDamagePercentFromAffixes(equippedDice?.pre);

	if (fdp > 0 && flat && !flat.includes('%')) {
		return `${flat} · +${fdp}% increased flat damage`;
	}
	if (fdp > 0 && !flat) {
		return `+${fdp}% increased flat damage`;
	}

	return flat;
}

function renderTupleRowsHtml(rows = [], emptyText = 'None') {
	if (!rows?.length) {
		return `<li class="tooltip-affix-compact tooltip-affix-compact--empty">${emptyText}</li>`;
	}
	return rows
		.map(
			([label, value]) =>
				`<li class="tooltip-affix-compact"><span class="tooltip-affix-name">${label}</span><span class="tooltip-affix-value">${value}</span></li>`
		)
		.join('');
}

function renderTupleAffixPanelHtml(label, rows) {
	if (!rows?.length) return '';
	return `<div class="tooltip-section-label">${label}</div><ul class="tooltip-affix-list">${renderTupleRowsHtml(rows)}</ul>`;
}

function getItemTypeLabel(item) {
	if (item?.m === 'equip_dice' || item?.mechanic === 'equip_dice') {
		return 'Dice';
	}
	if (isCraftableItem(item)) {
		const affixType = getAffixTypeForMechanic(item.m || item.mechanic);
		return affixType === 'prefix' ? 'Prefix Essence' : 'Suffix Essence';
	}
	if (isSocketableItem(item)) {
		return 'Weighting Stone';
	}
	return 'Item';
}

function getDiceFlatDamagePerRollLine(item) {
	const stats = item?.t;
	if (stats) {
		const gearMin = Number(stats.fdMin || 0);
		const gearMax = Number(stats.fdMax || 0);
		const edgeMin = Number(stats.fdRollMin || 0);
		const edgeMax = Number(stats.fdRollMax || 0);
		const min = gearMin + edgeMin;
		const max = gearMax + edgeMax;

		if (max > 0) {
			const percent = Number(stats.fdPct ?? item?.fdp ?? 0);
			const scale = (value) => Math.floor(Number(value || 0) * (1 + percent / 100));
			return `+${scale(min)}-${scale(max)} per roll`;
		}
	}

	const flat = String(item?.flat || item?.flat_damage_display || '').trim();
	if (!flat) return '';

	const primaryPart = flat.split('·')[0].trim();
	if (/per roll/i.test(primaryPart)) {
		return primaryPart;
	}

	if (flat.includes('%')) {
		return '';
	}

	if (/^\+?\d+\s*[-–]\s*\d+/.test(primaryPart)) {
		return `${primaryPart} per roll`;
	}

	return '';
}

function buildDiceTooltipHtml(item) {
	const title = item.cn || item.crafted_name || item.n || item.name;
	const socketCount = Math.max(0, Number(item.sc ?? item.socket_count) || 0);
	const socketLine = `${socketCount} Socket${socketCount === 1 ? '' : 's'}`;
	const flatPerRollLine = getDiceFlatDamagePerRollLine(item);
	const skv = item.skv || [];
	const imp = (item.imp || item.implicits || []).map((row) =>
		Array.isArray(row) ? row : [row.label, row.display]
	);
	const pre = item.pre || [];
	const suf = item.suf || [];

	const skvHtml = skv.length
		? `<ul class="tooltip-affix-list tooltip-socket-list">${renderTupleRowsHtml(skv)}</ul>`
		: '';
	const impHtml = imp.length
		? `<ul class="tooltip-affix-list tooltip-implicit-list">${renderTupleRowsHtml(imp)}</ul>`
		: '';

	const affixBlock = `${renderCraftedAffixPanelHtml('Prefixes', pre)}${renderCraftedAffixPanelHtml('Suffixes', suf)}`;
	const divider = affixBlock ? '<div class="tooltip-divider" role="presentation"></div>' : '';
	const loreHtml = item.lore ? `<div class="tooltip-lore">${item.lore}</div>` : '';
	const rarity = item.r ?? item.rarity ?? 'Common';

	return `
		<div class="tooltip-title">${title}</div>
		<div class="tooltip-dice-summary">${socketLine}</div>
		${flatPerRollLine ? `<div class="tooltip-dice-summary tooltip-dice-summary--flat">${flatPerRollLine}</div>` : ''}
		${skvHtml}
		${impHtml}
		${divider}
		${affixBlock}
		<div class="tooltip-meta">${rarity} · Dice</div>
		${loreHtml}
	`;
}

function buildGenericTooltipHtml(item) {
	const affixType = isCraftableItem(item) ? getAffixTypeForMechanic(item.m || item.mechanic) : null;
	const statLine = item.d || item.stat_description || '';
	const loreHtml = item.lore ? `<div class="tooltip-lore">${item.lore}</div>` : '';
	const rarity = item.r ?? item.rarity ?? 'Common';

	return `
		${affixType ? formatAffixBadge(affixType) : ''}
		<div class="tooltip-title">${item.n || item.name}</div>
		${statLine ? `<div class="tooltip-stat">${statLine}</div>` : ''}
		<div class="tooltip-meta">${rarity} · ${getItemTypeLabel(item)}</div>
		${loreHtml}
	`;
}

function buildInventoryTooltipHtml(item) {
	if (item?.m === 'equip_dice' || item?.mechanic === 'equip_dice') {
		return buildDiceTooltipHtml(item);
	}
	return buildGenericTooltipHtml(item);
}

function renderTupleAffixListHtml(rows = [], emptyText = 'None') {
	return renderTupleRowsHtml(rows, emptyText);
}

function expandSocketTuple(tuple) {
	if (!Array.isArray(tuple)) return tuple;
	const [slot_index, source_loot_id, source_name, source_rarity, rolled_value, mechanic, roll_tier] =
		tuple;
	return {
		slot_index,
		source_loot_id,
		source_name,
		source_rarity,
		rolled_value,
		mechanic,
		roll_tier,
	};
}

function buildEmptySocketTooltip() {
	const tip = document.createElement('div');
	tip.className = 'tooltip-box';
	tip.innerHTML = `
		<div class="tooltip-title">Empty Socket</div>
		<div class="tooltip-stat">Drop a socketable item here</div>
	`;
	return tip;
}

function buildSocketedItemTooltip(socket) {
	const tip = document.createElement('div');
	const normalizedSocket =
		typeof expandSocketTuple === 'function' ? expandSocketTuple(socket) : socket;
	const rollTier =
		typeof getModifierRollTierFromModifier === 'function'
			? getModifierRollTierFromModifier(normalizedSocket)
			: null;
	const tierClass =
		rollTier != null
			? `tier-${getModifierTierCssKey(rollTier)}`
			: `rarity-${(normalizedSocket?.source_rarity || 'common').toLowerCase()}`;
	tip.className = `tooltip-box ${tierClass}`;

	const name = normalizedSocket?.source_name || 'Weighting Stone';
	const faceLabel = getAffixStatLabel(normalizedSocket?.mechanic);
	const value = Number(normalizedSocket?.rolled_value ?? normalizedSocket?.source_statline ?? 0);
	const tierBadge =
		rollTier != null && typeof formatModifierTierBadge === 'function'
			? formatModifierTierBadge(rollTier)
			: '';
	const tierLabel =
		rollTier != null && typeof formatModifierTierLabel === 'function'
			? formatModifierTierLabel(rollTier)
			: normalizedSocket?.source_rarity || 'Common';

	tip.innerHTML = `
		<div class="tooltip-title">${name}</div>
		<div class="tooltip-stat">${faceLabel} · +${value}</div>
		<div class="tooltip-meta">${tierBadge}${tierLabel} · Weighting Stone</div>
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
window.buildInventoryTooltipHtml = buildInventoryTooltipHtml;
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
window.renderTupleAffixListHtml = renderTupleAffixListHtml;
window.expandSocketTuple = expandSocketTuple;
window.buildEmptySocketTooltip = buildEmptySocketTooltip;
window.buildSocketedItemTooltip = buildSocketedItemTooltip;
window.formatEquippedFlatDamageDisplay = formatEquippedFlatDamageDisplay;
window.normalizeCraftedAffixRow = normalizeCraftedAffixRow;
window.renderTuplePanelListHtml = renderTuplePanelListHtml;
window.renderSocketListHtml = renderSocketListHtml;
window.appendAffixBadgeToSlot = appendAffixBadgeToSlot;
