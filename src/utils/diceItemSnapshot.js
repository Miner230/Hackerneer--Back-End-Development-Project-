const {
	buildCraftedDiceName,
	computeEffectiveDiceStats,
	buildImplicitModifiers,
	formatEffectiveFlatDamageDisplay,
	isEssenceAffixModifier,
	getAffixStatLabel,
	formatCraftedModifierDisplay,
} = require('./diceEssenceCraft.js');
const { getModifierAffixSublabel } = require('./diceModifierLabels.js');
const { modifierTierFromSourceRarity } = require('./modifierRollTiers.js');
const { resolveGearFlatDamageRange } = require('./diceItemLevel.js');

function parseStatsSnapshot(raw) {
	if (!raw) return null;
	if (typeof raw === 'object') return raw;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function buildDiceItemSnapshot(dieRow, modifiers = [], sockets = []) {
	const essenceMods = modifiers.filter(isEssenceAffixModifier);
	const gearFlat = resolveGearFlatDamageRange(dieRow);
	const effectiveStats = computeEffectiveDiceStats(dieRow, essenceMods, sockets);
	const flat = formatEffectiveFlatDamageDisplay(effectiveStats);

	const imp = buildImplicitModifiers(dieRow)
		.filter((row) => row.key !== 'flat_damage')
		.map((row) => [row.label, row.display]);

	const skv = (sockets || []).map((socket) => [
		getAffixStatLabel(socket.mechanic),
		`+${Number(socket.rolled_value || 0)}`,
	]);

	const pre = [];
	const suf = [];
	essenceMods.forEach((modifier) => {
		const sublabel = getModifierAffixSublabel(modifier);
		const sourceKind = modifier.source_kind === 'intrinsic' ? 'i' : 'c';
		const rollTier = modifierTierFromSourceRarity(modifier.source_rarity);
		const row = [
			getAffixStatLabel(modifier.essence_mechanic),
			formatCraftedModifierDisplay(modifier),
			sublabel,
			sourceKind,
			rollTier,
		];
		if (modifier.affix_type === 'prefix') pre.push(row);
		else suf.push(row);
	});

	const socks = (sockets || []).map((socket) => [
		Number(socket.slot_index) || 0,
		Number(socket.source_loot_id) || 0,
		socket.source_name || 'Weighting Stone',
		socket.source_rarity || 'Common',
		Number(socket.rolled_value) || 0,
		socket.mechanic,
		modifierTierFromSourceRarity(socket.source_rarity),
	]);

	return {
		cn: buildCraftedDiceName(dieRow.name, essenceMods),
		flat: flat || null,
		gf: { min: gearFlat.min, max: gearFlat.max },
		imp,
		skv,
		pre,
		suf,
		socks,
		t: {
			s1: effectiveStats.side_1,
			s2: effectiveStats.side_2,
			s3: effectiveStats.side_3,
			s4: effectiveStats.side_4,
			s5: effectiveStats.side_5,
			s6: effectiveStats.side_6,
			rolls: effectiveStats.no_of_rolls,
			crit: effectiveStats.crit_chance,
			critP: effectiveStats.crit_power,
			dupC: effectiveStats.duplication_chance,
			dupN: effectiveStats.duplication_number,
			fdMin: effectiveStats.flat_damage_min,
			fdMax: effectiveStats.flat_damage_max,
			fdPct: effectiveStats.flat_damage_percent,
			fdRollMin: effectiveStats.flat_damage_roll_min,
			fdRollMax: effectiveStats.flat_damage_roll_max,
		},
	};
}

function snapshotForApi(snapshot) {
	if (!snapshot) return null;
	return {
		cn: snapshot.cn,
		flat: snapshot.flat,
		fdp: Number(snapshot.t?.fdPct) || 0,
		imp: snapshot.imp || [],
		skv: snapshot.skv || [],
		pre: snapshot.pre || [],
		suf: snapshot.suf || [],
	};
}

function snapshotTotalsForDiceTable(snapshot) {
	const t = snapshot?.t;
	if (!t) return null;

	return {
		side_1: t.s1,
		side_2: t.s2,
		side_3: t.s3,
		side_4: t.s4,
		side_5: t.s5,
		side_6: t.s6,
		no_of_rolls: t.rolls,
		duplication_chance: t.dupC,
		duplication_number: t.dupN,
		crit_chance: t.crit,
		crit_power: t.critP,
		flat_damage_min: t.fdMin,
		flat_damage_max: t.fdMax,
		flat_damage: t.fdMax,
		flat_damage_percent: t.fdPct,
		flat_damage_roll_min: t.fdRollMin,
		flat_damage_roll_max: t.fdRollMax,
	};
}

function formatCompactDiceItem(row, snapshotOverride = null) {
	const snapshot = snapshotOverride || parseStatsSnapshot(row.stats_snapshot);
	const apiSnap = snapshotForApi(snapshot);

	return {
		id: row.id ?? row.dice_instance_id,
		lid: row.loot_id,
		q: 1,
		m: 'equip_dice',
		n: row.name,
		r: row.instance_rarity || row.rarity || 'Common',
		ik: row.image_key || null,
		il: Number(row.item_level) || 1,
		sc: Number(row.socket_count) || 0,
		lore: row.lore || '',
		...(apiSnap || { cn: row.name, flat: null, imp: [], skv: [], pre: [], suf: [] }),
	};
}

function formatCompactEquippedItem(row, snapshotOverride = null) {
	const snapshot = snapshotOverride || parseStatsSnapshot(row.stats_snapshot);
	const item = formatCompactDiceItem(row, snapshot);

	return {
		...item,
		socks: snapshot?.socks || [],
	};
}

function formatCompactStackableItem(row) {
	return {
		lid: row.loot_id,
		q: Number(row.quantity) || 0,
		m: row.mechanic,
		n: row.name,
		r: row.rarity || 'Common',
		ik: row.image_key || null,
		d: row.stat_description || '',
		lore: row.lore || '',
	};
}

module.exports = {
	parseStatsSnapshot,
	buildDiceItemSnapshot,
	snapshotForApi,
	snapshotTotalsForDiceTable,
	formatCompactDiceItem,
	formatCompactEquippedItem,
	formatCompactStackableItem,
};
