const BASE_XP = 100;
const GROWTH_RATE = 1.12;

function getXpRequiredToLevelUp(currentLevel, baseXP = BASE_XP, growthRate = GROWTH_RATE) {
	const level = Math.max(1, Number(currentLevel) || 1);
	return Math.floor(baseXP * growthRate ** (level - 1));
}

function getKillXpReward(monsterLevel, baseXP = BASE_XP) {
	const level = Math.max(1, Number(monsterLevel) || 1);
	return Math.max(1, Math.floor((baseXP * level) / 5));
}

function applyXpGain(currentLevel, currentExperience, xpGained) {
	let level = Math.max(1, Number(currentLevel) || 1);
	let experience = Math.max(0, Number(currentExperience) || 0) + Math.max(0, Number(xpGained) || 0);
	let levelsGained = 0;

	while (true) {
		const required = getXpRequiredToLevelUp(level);
		if (experience < required) break;
		experience -= required;
		level += 1;
		levelsGained += 1;
	}

	return { level, experience, levelsGained };
}

function getXpProgress(currentLevel, currentExperience) {
	const level = Math.max(1, Number(currentLevel) || 1);
	const experience = Math.max(0, Number(currentExperience) || 0);
	const required = getXpRequiredToLevelUp(level);

	return {
		current: experience,
		required,
		percent: required > 0 ? Math.min(100, Math.round((experience / required) * 100)) : 100,
	};
}

module.exports = {
	BASE_XP,
	GROWTH_RATE,
	getXpRequiredToLevelUp,
	getKillXpReward,
	applyXpGain,
	getXpProgress,
};
