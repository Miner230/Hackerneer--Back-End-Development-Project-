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

function groupModifiersWithTiers(mods = []) {
	const grouped = new Map();

	mods.forEach((mod) => {
		const name = mod?.name || 'Unknown';
		const existing = grouped.get(name);

		if (existing) {
			existing.count += 1;
			return;
		}

		grouped.set(name, {
			name,
			count: 1,
			description: mod?.description || name,
		});
	});

	return Array.from(grouped.values())
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
		.map((mod) => ({
			...mod,
			displayName: getModifierTierName(mod.name, mod.count),
		}));
}
