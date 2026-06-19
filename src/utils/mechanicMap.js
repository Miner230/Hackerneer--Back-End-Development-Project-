module.exports = {
	//Dice crit chance
	crit_chance: {
		table: 'dice',
		row: 'crit_chance',
		indexName: 'user_id',
	},
	//Dice crit power
	crit_power: {
		table: 'dice',
		row: 'crit_power',
		indexName: 'user_id',
	},
	//No of rolls of the dice for each instance
	no_of_rolls: {
		table: 'dice',
		row: 'no_of_rolls',
		indexName: 'user_id',
	},
	//Chance for duplication
	duplication_chance: {
		table: 'dice',
		row: 'duplication_chance',
		indexName: 'user_id',
	},
	//The amount of duplications per dice roll
	duplication_number: {
		table: 'dice',
		row: 'duplication_number',
		indexName: 'user_id',
	},
	//sandboxed enemy level based on voidstone count
	enemy_level: {
		table: 'user',
		row: 'voidstone_count',
		indexName: 'id',
	},
	// chance to hit face 1 on the dice
	face_1: {
		table: 'dice',
		row: 'side_1',
		indexName: 'user_id',
	},
	// chance to hit face 2 on the dice
	face_2: {
		table: 'dice',
		row: 'side_2',
		indexName: 'user_id',
	},
	// chance to hit face 3 on the dice
	face_3: {
		table: 'dice',
		row: 'side_3',
		indexName: 'user_id',
	},
	// chance to hit face 4 on the dice
	face_4: {
		table: 'dice',
		row: 'side_4',
		indexName: 'user_id',
	},
	// chance to hit face 5 on the dice
	face_5: {
		table: 'dice',
		row: 'side_5',
		indexName: 'user_id',
	},
	// chance to hit face 6 on the dice
	face_6: {
		table: 'dice',
		row: 'side_6',
		indexName: 'user_id',
	},
	player_flat_health: {
		table: 'user',
		row: 'player_flat_health',
		indexName: 'id',
	},
	player_max_health_percent: {
		table: 'user',
		row: 'player_max_health_percent',
		indexName: 'id',
	},
	damage_reduction_penetration: {
		table: 'user',
		row: 'damage_reduction_penetration',
		indexName: 'id',
	},
	player_life_regen: {
		table: 'user',
		row: 'player_life_regen',
		indexName: 'id',
	},
	player_speed_bonus: {
		table: 'user',
		row: 'player_speed_bonus',
		indexName: 'id',
	},
};
