// Loads and displays the current user's dice stats using passed-in API data
function loadDiceInfo(data) {
	const diceDiv = document.getElementById('diceInfo');

	// check for missing or invalid dice stats
	if (!data || !data.rows) {
		diceDiv.innerHTML = `<div class="text-danger text-center">Failed to load dice data.</div>`;
		return;
	}

	const stats = data.rows;
	const playerBonuses = data.playerBonuses || {};
	const drPenetration = Number(playerBonuses.damage_reduction_penetration || 0);
	const modifiers = Array.isArray(data.diceModifiers) ? data.diceModifiers : [];

	const gearMin = Number(stats.flat_damage_min || 0) || Number(stats.level || 1);
	const gearMax =
		Number(stats.flat_damage_max || 0) ||
		Number(stats.flat_damage || 0) ||
		Math.max(1, Number(stats.level || 1) * 5);
	const edgeMin = Number(stats.flat_damage_roll_min || 0);
	const edgeMax = Number(stats.flat_damage_roll_max || 0);
	const combinedFlatMin = gearMin + edgeMin;
	const combinedFlatMax = gearMax + edgeMax;
	const combinedFlatDisplay =
		combinedFlatMax > 0 ? `+${combinedFlatMin}-${combinedFlatMax}` : '+0';

	const EDGE_FLAT_DAMAGE_RANGES = {
		Common: { min: 1, max: 3 },
		Uncommon: { min: 1, max: 6 },
		Rare: { min: 5, max: 15 },
		Epic: { min: 20, max: 60 },
		Legendary: { min: 130, max: 150 },
	};

	function formatProfileModifierValue(modifier) {
		if (modifier.essence_mechanic === 'dice_flat_damage_percent') {
			return `+${modifier.rolled_value}%`;
		}
		if (modifier.essence_mechanic === 'dice_flat_damage_roll') {
			const rarity = String(modifier.source_rarity || 'Common');
			const range = EDGE_FLAT_DAMAGE_RANGES[rarity] || EDGE_FLAT_DAMAGE_RANGES.Common;
			return `+${range.min}-${range.max}`;
		}
		return `+${modifier.rolled_value}`;
	}

	const modifierRows = modifiers
		.map((modifier) => {
			const valueText = formatProfileModifierValue(modifier);
			const rollTier =
				modifier.roll_tier != null
					? Number(modifier.roll_tier)
					: typeof getModifierRollTier === 'function'
						? getModifierRollTier(modifier.source_rarity)
						: null;
			const tierLabel =
				rollTier != null && typeof formatModifierTierLabel === 'function'
					? formatModifierTierLabel(rollTier)
					: '';
			const tierSuffix = tierLabel ? ` <span class="text-muted">${tierLabel}</span>` : '';
			return `<li class="list-group-item d-flex justify-content-between ${modifier.affix_type === 'prefix' ? 'text-primary' : 'text-warning'}">${modifier.modifier_name}${tierSuffix}<span>${valueText}</span></li>`;
		})
		.join('');

	diceDiv.innerHTML = `
    <div class="card mb-4 p-3 profile-card text-light">
      <div class="row align-items-center g-3">
          <h4 class="text-center mb-3 rpg-heading">Dice Stats</h4>
          <ul class="list-group list-group-flush bg-transparent stat-list">
            <li class="list-group-item d-flex justify-content-between text-success">Level<span>${stats.level}</span></li>
            <li class="list-group-item d-flex justify-content-between">No. of rolls<span>${stats.no_of_rolls}</span></li>
            <li class="list-group-item d-flex justify-content-between text-primary">Duplication Chance ☆<span>${stats.duplication_chance}</span></li>
            <li class="list-group-item d-flex justify-content-between text-primary">Duplication Number ✵<span>${stats.duplication_number}</span></li>
            <li class="list-group-item d-flex justify-content-between text-warning">Flat Damage per Roll<span>${combinedFlatDisplay}</span></li>
            <li class="list-group-item d-flex justify-content-between text-warning">Increased Flat Damage %<span>${stats.flat_damage_percent ?? 0}%</span></li>
            <li class="list-group-item d-flex justify-content-between text-danger">Critical Chance ☣<span>${stats.crit_chance}</span></li>
            <li class="list-group-item d-flex justify-content-between text-danger">Critical Power ☠︎︎<span>${stats.crit_power}</span></li>
            <li class="list-group-item d-flex justify-content-between text-warning">DR Penetration ⚔<span>${drPenetration}</span></li>
            <li class="list-group-item d-flex justify-content-between">Side 1 Weight<span>${stats.side_1}</span></li>
            <li class="list-group-item d-flex justify-content-between">Side 2 Weight<span>${stats.side_2}</span></li>
            <li class="list-group-item d-flex justify-content-between">Side 3 Weight<span>${stats.side_3}</span></li>
            <li class="list-group-item d-flex justify-content-between">Side 4 Weight<span>${stats.side_4}</span></li>
            <li class="list-group-item d-flex justify-content-between">Side 5 Weight<span>${stats.side_5}</span></li>
            <li class="list-group-item d-flex justify-content-between">Side 6 Weight<span>${stats.side_6}</span></li>
          </ul>
          ${modifierRows ? `<h5 class="text-center mt-4 mb-2 rpg-heading">Affixes</h5><ul class="list-group list-group-flush bg-transparent stat-list">${modifierRows}</ul>` : ''}
      </div>
    </div>
  `;
}
