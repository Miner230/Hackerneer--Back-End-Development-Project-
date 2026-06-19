const WEIGHTING_STONE_MECHANICS = new Set([
	'face_1',
	'face_2',
	'face_3',
	'face_4',
	'face_5',
	'face_6',
]);

function isSocketableMechanic(mechanic) {
	return WEIGHTING_STONE_MECHANICS.has(mechanic);
}

function rollDiceSocketCount() {
	return Math.floor(Math.random() * 7);
}

function formatSocketRow(row) {
	return {
		id: row.id,
		dice_instance_id: row.dice_instance_id,
		slot_index: row.slot_index,
		mechanic: row.mechanic,
		rolled_value: row.rolled_value,
		source_loot_id: row.source_loot_id,
		source_rarity: row.source_rarity,
		source_name: row.source_name,
		source_stat_description: row.source_stat_description,
		source_statline: row.source_statline,
	};
}

module.exports = {
	WEIGHTING_STONE_MECHANICS,
	isSocketableMechanic,
	rollDiceSocketCount,
	formatSocketRow,
};
