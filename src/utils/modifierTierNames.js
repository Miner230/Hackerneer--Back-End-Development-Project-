// Escalating display names per modifier stack count (index 0 = 1 stack, etc.)
const MODIFIER_NAME_TIERS = {
	Giant: ['Giant', 'Massive', 'Colossal', 'Titanic', 'Gargantuan'],
	Regenerative: ['Regenerative', 'Restorative', 'Undying', 'Eternal', 'Immortal'],
	Fortified: ['Fortified', 'Armored', 'Bastioned', 'Impenetrable', 'Invulnerable'],
	Shiny: ['Shiny', 'Glittering', 'Radiant', 'Luminous', 'Blinding'],
	Speedy: ['Speedy', 'Swift', 'Hasty', 'Blurred', 'Lightning'],
	Bloodthirsty: ['Bloodthirsty', 'Ferocious', 'Vicious', 'Carnivorous', 'Insatiable'],
	Deadly: ['Deadly', 'Lethal', 'Mortal', 'Executioner', 'Annihilating'],
	Echoing: ['Echoing', 'Resonant', 'Reverberating', 'Cascading', 'Infinite'],
	Prolific: ['Prolific', 'Duplicating', 'Swarming', 'Legion', 'Multitudinous'],
	Savage: ['Savage', 'Feral', 'Brutal', 'Primal', 'Untamed'],
};

function getModifierTierName(modifierName, stackCount) {
	const count = Math.max(1, Number(stackCount) || 1);
	const tiers = MODIFIER_NAME_TIERS[modifierName];

	if (!tiers) {
		return count > 1 ? `${modifierName} ×${count}` : modifierName;
	}

	return tiers[Math.min(count - 1, tiers.length - 1)];
}

function countModifierStacks(selectedModifiers = []) {
	const counts = new Map();

	selectedModifiers.forEach((mod) => {
		const name = mod?.name;
		if (!name) return;
		counts.set(name, (counts.get(name) || 0) + 1);
	});

	return counts;
}

function buildModdedMonsterName(baseName, selectedModifiers = []) {
	const counts = countModifierStacks(selectedModifiers);
	if (!counts.size) return baseName;

	const prefixes = Array.from(counts.entries())
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.map(([name, count]) => getModifierTierName(name, count));

	return `${prefixes.join(' ')} ${baseName}`;
}

module.exports = {
	MODIFIER_NAME_TIERS,
	getModifierTierName,
	countModifierStacks,
	buildModdedMonsterName,
};
