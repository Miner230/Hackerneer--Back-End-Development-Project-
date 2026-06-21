const pool = require('../services/db');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const password = '1234';
const pepper = process.env.JWT_PEPPER; // Load from .env
const passwordWithPepper = password + pepper;

const callback = (error, results, fields) => {
	if (error) {
		console.error('Error creating tables:', error);
	} else {
		console.log('Tables created successfully');
	}
	process.exit();
};

bcrypt.hash(passwordWithPepper, saltRounds, (error, hash) => {
	if (error) {
		console.error('Error hashing password:', error);
	} else {
		console.log('Hashed password:', hash);

		const SQLSTATEMENT = `
  DROP TABLE IF EXISTS delve_modifiers;
  DROP TABLE IF EXISTS delve_enemies;
  DROP TABLE IF EXISTS user_dungeon_runs;
  DROP TABLE IF EXISTS dice_modifiers;
  DROP TABLE IF EXISTS dice_socketed_items;
  DROP TABLE IF EXISTS dice_gear;
  DROP TABLE IF EXISTS user_dice;
  DROP TABLE IF EXISTS inventory;
  DROP TABLE IF EXISTS delve_instances;
  DROP TABLE IF EXISTS dice;
  DROP TABLE IF EXISTS report;
  DROP TABLE IF EXISTS review;
  DROP TABLE IF EXISTS vulnerability;
  DROP TABLE IF EXISTS loot;
  DROP TABLE IF EXISTS monster_modifiers;
  DROP TABLE IF EXISTS monsters;
  DROP TABLE IF EXISTS user;

  CREATE TABLE user (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username TEXT NOT NULL,
      account_role ENUM('user', 'admin', 'god') NOT NULL DEFAULT 'user',
      password TEXT NOT NULL,
      level INT DEFAULT 1,
      experience INT NOT NULL DEFAULT 0,
      level_up_cost BIGINT DEFAULT 100,
      voidstone_count INT DEFAULT 0,
      loot_shard INT DEFAULT 0,
      number_of_delve_completed INT DEFAULT 0,
      player_flat_health INT NOT NULL DEFAULT 0,
      player_max_health_percent INT NOT NULL DEFAULT 0,
      damage_reduction_penetration INT NOT NULL DEFAULT 0,
      player_life_regen INT NOT NULL DEFAULT 0,
      player_speed_bonus INT NOT NULL DEFAULT 0,
      equipped_dice_id INT NULL
  );

  CREATE TABLE user_dice (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      loot_id INT NOT NULL,
      item_level INT NOT NULL DEFAULT 1,
      socket_count INT NOT NULL DEFAULT 0,
      instance_rarity VARCHAR(32) NOT NULL DEFAULT 'Common',
      drop_rarity_score INT NOT NULL DEFAULT 100,
      stats_snapshot JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      loot_id INT NOT NULL,
      quantity INT NOT NULL,
      UNIQUE(user_id, loot_id)
  );

  CREATE TABLE monsters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    weight INT NOT NULL
  );

  CREATE TABLE monster_modifiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    weight INT NOT NULL
  );

  CREATE TABLE dice (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      side_1 INT NOT NULL,
      side_2 INT NOT NULL,
      side_3 INT NOT NULL,
      side_4 INT NOT NULL,
      side_5 INT NOT NULL,
      side_6 INT NOT NULL,
      no_of_rolls INT DEFAULT 5,
      duplication_chance INT DEFAULT 5,
      duplication_number INT DEFAULT 1,
      crit_chance INT DEFAULT 10,
      crit_power INT DEFAULT 200,
      flat_damage INT NOT NULL DEFAULT 0,
      flat_damage_min INT NOT NULL DEFAULT 0,
      flat_damage_max INT NOT NULL DEFAULT 0,
      flat_damage_percent INT NOT NULL DEFAULT 0,
      flat_damage_roll_min INT NOT NULL DEFAULT 0,
      flat_damage_roll_max INT NOT NULL DEFAULT 0
  );

  CREATE TABLE dice_gear (
      loot_id INT PRIMARY KEY,
      image_key VARCHAR(64) NOT NULL,
      side_1 INT NOT NULL DEFAULT 10,
      side_2 INT NOT NULL DEFAULT 10,
      side_3 INT NOT NULL DEFAULT 10,
      side_4 INT NOT NULL DEFAULT 10,
      side_5 INT NOT NULL DEFAULT 10,
      side_6 INT NOT NULL DEFAULT 10,
      no_of_rolls INT NOT NULL DEFAULT 5,
      duplication_chance INT NOT NULL DEFAULT 5,
      duplication_number INT NOT NULL DEFAULT 1,
      crit_chance INT NOT NULL DEFAULT 10,
      crit_power INT NOT NULL DEFAULT 200,
      flat_damage INT NOT NULL DEFAULT 0
  );

  CREATE TABLE dice_modifiers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      dice_instance_id INT NOT NULL,
      affix_type ENUM('prefix', 'suffix') NOT NULL DEFAULT 'suffix',
      slot_index INT NOT NULL,
      essence_mechanic VARCHAR(64) NOT NULL,
      essence_family VARCHAR(64) NOT NULL,
      modifier_name VARCHAR(128) NOT NULL,
      rolled_value INT NOT NULL,
      source_loot_id INT NOT NULL,
      source_rarity VARCHAR(32) NOT NULL,
      source_kind ENUM('crafted', 'intrinsic') NOT NULL DEFAULT 'crafted',
      UNIQUE KEY uniq_dice_family (user_id, dice_instance_id, essence_family)
  );

  CREATE TABLE dice_socketed_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      dice_instance_id INT NOT NULL,
      slot_index INT NOT NULL,
      mechanic VARCHAR(64) NOT NULL,
      rolled_value INT NOT NULL,
      source_loot_id INT NOT NULL,
      source_rarity VARCHAR(32) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE delve_instances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      monster_id INT NOT NULL,
      monster_name TEXT NOT NULL,
      level INT NOT NULL,
      health INT NOT NULL,
      life_regen INT NOT NULL,
      damage_reduction INT NOT NULL,
      roll_attempt INT NOT NULL,
      item_quantity INT NOT NULL,
      item_rarity INT NOT NULL,
      player_health INT NOT NULL,
      player_max_health INT NOT NULL,
      player_damage_reduction INT NOT NULL DEFAULT 0,
      player_life_regen INT NOT NULL DEFAULT 0,
      damage_reduction_penetration INT NOT NULL DEFAULT 0,
      monster_attack INT NOT NULL DEFAULT 0,
      active_turn VARCHAR(10) NOT NULL DEFAULT 'player',
      player_speed INT NOT NULL DEFAULT 1,
      monster_speed INT NOT NULL DEFAULT 2,
      attacks_remaining INT NOT NULL DEFAULT 1,
      status VARCHAR(20) DEFAULT 'in progress'
  );

  CREATE TABLE delve_modifiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    delve_instance_id INT NOT NULL,
    modifier_id INT NOT NULL,
    delve_enemy_id INT NULL
  );

  CREATE TABLE delve_enemies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      delve_instance_id INT NOT NULL,
      slot_index INT NOT NULL,
      monster_id INT NOT NULL,
      monster_name TEXT NOT NULL,
      level INT NOT NULL,
      max_health INT NOT NULL,
      health INT NOT NULL,
      life_regen INT NOT NULL DEFAULT 0,
      damage_reduction INT NOT NULL DEFAULT 0,
      roll_attempt INT NOT NULL DEFAULT 0,
      item_quantity INT NOT NULL DEFAULT 1,
      item_rarity INT NOT NULL DEFAULT 0,
      monster_speed INT NOT NULL DEFAULT 2,
      status VARCHAR(20) NOT NULL DEFAULT 'alive',
      UNIQUE KEY uq_delve_enemy_slot (delve_instance_id, slot_index)
  );

  CREATE TABLE user_dungeon_runs (
      user_id INT NOT NULL PRIMARY KEY,
      run_blob VARCHAR(96) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE loot (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name TEXT NOT NULL,
    mechanic TEXT NOT NULL,
    stat_description TEXT NOT NULL,
    statline INT NOT NULL,
    rarity TEXT NOT NULL, 
    lore TEXT NOT NULL,
    craft_cost INT NOT NULL,
    weight INT NOT NULL
  );

  INSERT INTO user (username, password, level, level_up_cost, voidstone_count, loot_shard, number_of_delve_completed)
  VALUES 
  ("Admin", '${hash}', 300, 300, 1, 10, 5),
  ("KingCow", '${hash}', 1000, 300, 10, 1000000, 5),
  ("Fabiheeheehaahaa", '${hash}', 3, 300, 10, 1000000, 5),
  ("LackOfMoney", '${hash}', 5, 300, 10, 1000000, 5),
  ("Deevashz2007", '${hash}', 100, 300, 10, 1000000, 5),
  ("CharlesBurger", '${hash}', 10, 300, 10, 1000000, 5);

  INSERT INTO dice (user_id, side_1, side_2, side_3, side_4, side_5, side_6, no_of_rolls, duplication_chance, duplication_number, crit_chance, crit_power)
  VALUES 
  (1, 10, 10, 10, 10, 10, 10, 5, 100, 1, 100, 20000),
  (2, 10, 10, 10, 10, 10, 10, 13, 100, 7, 100, 2200);

  INSERT INTO monsters (name, description, weight)
  VALUES
  ("Zombie", "Slow-moving undead. Hides in dark corners, craving flesh.", 20),
  ("Skeleton", "A pile of bones animated by dark magic, armed with an old sword.", 20),
  ("Rat", "Small, fast, and always hungry. Nibbles on whatever it can find.", 20),
  ("Bat", "Flies in the dark, screeching and flapping its wings. Weak but fast.", 20),
  ("Slime", "A blob of jelly-like goo, often found in caves or dark dungeons.", 20),
  ("Spider", "Creeps on eight legs, spinning webs and trapping prey.", 20),
  ("Ghost", "A haunting specter, its form barely visible. Known to cause shivers.", 20),
  ("Blob", "A fat, slow slime that rolls around aimlessly. Not much of a threat.", 20),
  ("Leech", "A parasitic creature that attaches itself to its prey and drains its energy.", 20),
  ("Ghoul", "A faster, more aggressive version of a zombie, with a thirst for blood.", 20),
  ("Dog", "An undead canine, still loyal to its master despite its decay.", 20),
  ("Bird", "A skeletal bird that flaps its wings and screeches loudly. Weak but persistent.", 20),
  ("Cultist", "A crazed worshiper of dark forces, armed with a dagger and ritualistic magic.", 20),
  ("Cow", "A decaying cow with a haunting moo. It's far from its original form.", 20),
  ("Golem", "A hulking rock creature, slow but powerful. It's the embodiment of earth.", 20),
  ("Worm", "A slippery, wriggling creature that thrives in the muck and damp places.", 20),
  ("Shadow", "Barely visible in the dark, its form shifts and changes in the shadows.", 20),
  ("Candle", "A bizarre animated candle that flickers and casts eerie shadows.", 20),
  ("Goblin", "A mischievous, small creature known for its greed and cunning.", 20),
  ("Gargoyle", "A stone creature that comes to life when you least expect it.", 20),
  ("Eagle", "A majestic but cursed bird. Its bones rattle as it soars through the skies.", 20),
  ("Dragon", "A fierce and mighty beast, with scales like armor and breath that burns.", 1),
  ("Cactus", "A sentient cactus, its spines sharp enough to pierce any intruder.", 20),
  ("Animated Armour", "A suit of armor that moves on its own, guarding treasures with a silent rage.", 20),
  ("Hand", "A severed, disembodied hand that crawls around looking for mischief.", 20),
  ("Moldy Cheese", "A rotten, stinky mass of cheese that should be avoided at all costs.", 20),
  ("Mimic", "A deceptive creature that disguises itself as treasure, waiting for the unwary.", 20),
  ("Werewolf", "A terrifying beast, part human, part wolf. It howls at the full moon.", 20),
  ("Flying Fork", "A bizarre flying utensil, sharp and quick, attacking from the air.", 20),
  ("Hydra", "A multi-headed beast, each head regenerating when chopped off. Dangerous and resilient.", 1),
  ("Orc", "A brutish warrior with a bad temper and a heavy axe. Not too bright but strong.", 1),
  ("Wet Dog", "A soggy, smelly canine. It's not quite undead, but it's still unpleasant.", 20),
  ("Cyclops", "A towering, one-eyed giant. Strong and slow but capable of crushing anything.", 1),
  ("Trash Bag", "A pile of discarded refuse that somehow moves. Unpredictable and gross.", 20),
  ("Elemental Spirit", "A being made of pure elemental energy. It shifts form and power depending on the elements.", 1),
  ("Vampire", "A bloodthirsty nocturnal creature. Fangs and claws are its weapons, and it can charm its prey.", 20);

  INSERT INTO monster_modifiers (name, description, weight)
  VALUES
  ("Giant", "Doubles the monster's max HP.", 30),
  ("Regenerative", "Monster heals a small amount at the end of each turn.", 30),
  ("Fortified", "Takes reduced damage.", 30),
  ("Shiny", "Doubles reward count", 1),
  ("Speedy", "Multiplies monster attack speed by 1.5×.", 25),
  ("Bloodthirsty", "Increases monster critical hit chance.", 25),
  ("Deadly", "Increases monster critical hit damage.", 25),
  ("Echoing", "Increases the chance for monster dice to duplicate.", 20),
  ("Prolific", "Increases how many times monster dice can duplicate.", 15),
  ("Savage", "Monster attacks roll with bonus level scaling.", 20);

  INSERT INTO loot (name, mechanic, stat_description, statline, rarity, lore, craft_cost, weight)
  VALUES 
  -- Voidstones (+ to enemy level)
  ("Lesser Voidstone", "enemy_level", "Use - next delve enemies are +1 levels", 1, "Common", "Stare into the void.", 500, 12),
  ("Mediocre Voidstone", "enemy_level", "Use - next delve enemies are +2 levels", 2, "Uncommon", "The void stirs slightly.", 1000, 12),
  ("Refined Voidstone", "enemy_level", "Use - next delve enemies are +3 levels", 3, "Rare", "The void whispers back.", 1500, 12),
  ("Greater Voidstone", "enemy_level", "Use - next delve enemies are +4 levels", 4, "Epic", "The void begins to take form.", 3000, 12),
  ("Perfect Voidstone", "enemy_level", "Use - next delve enemies are +5 levels", 5, "Legendary", "It has learnt to stare back...", 5000, 12),

  -- Essence of Fear (+ to critical chance)
  ("Lesser Essence of fear", "crit_chance", "Drag onto die - Suffix - rolls 1-3 Critical Chance ☣", 1, "Common", "Fear is a whisper.", 50, 12),
  ("Mediocre Essence of fear", "crit_chance", "Drag onto die - Suffix - rolls 2-6 Critical Chance ☣", 2, "Uncommon", "Fear grows near.", 100, 12),
  ("Refined Essence of fear", "crit_chance", "Drag onto die - Suffix - rolls 5-9 Critical Chance ☣", 3, "Rare", "Fear sharpens your instincts.", 150, 12),
  ("Greater Essence of fear", "crit_chance", "Drag onto die - Suffix - rolls 8-12 Critical Chance ☣", 4, "Epic", "Fear dominates the senses.", 300, 12),
  ("Perfect Essence of fear", "crit_chance", "Drag onto die - Suffix - rolls 13-15 Critical Chance ☣", 5, "Legendary", "Fear becomes real.", 500, 12),

  -- Essence of Chase (+ to critical power)
  ("Lesser Essence of chase", "crit_power", "Drag onto die - Suffix - rolls 10-30 Critical Power ☠︎", 10, "Common", "The hunt begins.", 50, 12),
  ("Mediocre Essence of chase", "crit_power", "Drag onto die - Suffix - rolls 28-60 Critical Power ☠︎", 20, "Uncommon", "The prey is close.", 100, 12),
  ("Refined Essence of chase", "crit_power", "Drag onto die - Suffix - rolls 54-90 Critical Power ☠︎", 30, "Rare", "The thrill intensifies.", 150, 12),
  ("Greater Essence of chase", "crit_power", "Drag onto die - Suffix - rolls 88-120 Critical Power ☠︎", 40, "Epic", "You see only the target.", 300, 12),
  ("Perfect Essence of chase", "crit_power", "Drag onto die - Suffix - rolls 130-150 Critical Power ☠︎", 50, "Legendary", "You are the hunt incarnate.", 500, 12),

  -- Essence of Mind (+ to duplication chance)
  ("Lesser Essence of mind", "duplication_chance", "Drag onto die - Suffix - rolls 1-3 Duplication Chance ☆", 1, "Common", "The mind is all you need.", 50, 12),
  ("Mediocre Essence of mind", "duplication_chance", "Drag onto die - Suffix - rolls 2-6 Duplication Chance ☆", 2, "Uncommon", "Thoughts begin to fracture.", 100, 12),
  ("Refined Essence of mind", "duplication_chance", "Drag onto die - Suffix - rolls 5-9 Duplication Chance ☆", 3, "Rare", "Ideas multiply effortlessly.", 150, 12),
  ("Greater Essence of mind", "duplication_chance", "Drag onto die - Suffix - rolls 8-12 Duplication Chance ☆", 4, "Epic", "Your mind shapes the void.", 300, 12),
  ("Perfect Essence of mind", "duplication_chance", "Drag onto die - Suffix - rolls 13-15 Duplication Chance ☆", 5, "Legendary", "The mind bends the world to your will.", 500, 12),

  -- Essence of Echoing (+ to duplication number)
  ("Lesser Essence of echoing", "duplication_number", "Drag onto die - Suffix - rolls 1-3 Duplication Number ✵", 1, "Common", "A faint ripple echoes reality.", 50, 12),
  ("Mediocre Essence of echoing", "duplication_number", "Drag onto die - Suffix - rolls 2-6 Duplication Number ✵", 2, "Uncommon", "One becomes two.", 100, 12),
  ("Refined Essence of echoing", "duplication_number", "Drag onto die - Suffix - rolls 5-9 Duplication Number ✵", 3, "Rare", "Copies echo from your will.", 150, 12),
  ("Greater Essence of echoing", "duplication_number", "Drag onto die - Suffix - rolls 8-12 Duplication Number ✵", 4, "Epic", "You wield infinite reflections.", 300, 12),
  ("Perfect Essence of echoing", "duplication_number", "Drag onto die - Suffix - rolls 13-15 Duplication Number ✵", 5, "Legendary", "What was once one now swarms.", 500, 12),
  
  -- Stones of Weighting (socket into dice)
  ("Stone of Weighting I", "face_1", "Socket into die slot - +1 weight on face 1 (fixed)", 1, "Common", "The first path grows heavier.", 50, 12),
  ("Stone of Weighting II", "face_2", "Socket into die slot - +1 weight on face 2 (fixed)", 1, "Common", "Two choices lie ahead.", 50, 12),
  ("Stone of Weighting III", "face_3", "Socket into die slot - +1 weight on face 3 (fixed)", 1, "Common", "Three is the number of balance.", 50, 12),
  ("Stone of Weighting IV", "face_4", "Socket into die slot - +1 weight on face 4 (fixed)", 1, "Common", "Four corners shape the world.", 50, 12),
  ("Stone of Weighting V", "face_5", "Socket into die slot - +1 weight on face 5 (fixed)", 1, "Common", "Five stars shine above.", 50, 12),
  ("Stone of Weighting VI", "face_6", "Socket into die slot - +1 weight on face 6 (fixed)", 1, "Common", "Six seals hold power.", 50, 12),

  ("Balanced Stone I", "face_1", "Socket into die slot - +3 weight on face 1 (fixed)", 3, "Rare", "Your fate leans toward the first.", 150, 12),
  ("Balanced Stone II", "face_2", "Socket into die slot - +3 weight on face 2 (fixed)", 3, "Rare", "The second outcome draws near.", 150, 12),
  ("Balanced Stone III", "face_3", "Socket into die slot - +3 weight on face 3 (fixed)", 3, "Rare", "You hear the call of three.", 150, 12),
  ("Balanced Stone IV", "face_4", "Socket into die slot - +3 weight on face 4 (fixed)", 3, "Rare", "Four is your guiding star.", 150, 12),
  ("Balanced Stone V", "face_5", "Socket into die slot - +3 weight on face 5 (fixed)", 3, "Rare", "Five pushes against the odds.", 150, 12),
  ("Balanced Stone VI", "face_6", "Socket into die slot - +3 weight on face 6 (fixed)", 3, "Rare", "Six draws destiny in your favor.", 150, 12),

  ("Stone of Dominion I", "face_1", "Socket into die slot - +5 weight on face 1 (fixed)", 5, "Legendary", "One dominates all outcomes.", 500, 12),
  ("Stone of Dominion II", "face_2", "Socket into die slot - +5 weight on face 2 (fixed)", 5, "Legendary", "Two bends the thread of chance.", 500, 12),
  ("Stone of Dominion III", "face_3", "Socket into die slot - +5 weight on face 3 (fixed)", 5, "Legendary", "Three carves its mark on fate.", 500, 12),
  ("Stone of Dominion IV", "face_4", "Socket into die slot - +5 weight on face 4 (fixed)", 5, "Legendary", "Four reshapes the world.", 500, 12),
  ("Stone of Dominion V", "face_5", "Socket into die slot - +5 weight on face 5 (fixed)", 5, "Legendary", "Five becomes inevitable.", 500, 12),
  ("Stone of Dominion VI", "face_6", "Socket into die slot - +5 weight on face 6 (fixed)", 5, "Legendary", "Six commands the dice.", 500, 12),

  -- Essence of Vigor (+ flat max health)
  ("Lesser Essence of vigor", "player_flat_health", "Drag onto die - Suffix - rolls 26-75 Max Health ♥", 25, "Common", "Warmth spreads through your core.", 50, 12),
  ("Mediocre Essence of vigor", "player_flat_health", "Drag onto die - Suffix - rolls 72-150 Max Health ♥", 50, "Uncommon", "Your body hardens against the abyss.", 100, 12),
  ("Refined Essence of vigor", "player_flat_health", "Drag onto die - Suffix - rolls 137-225 Max Health ♥", 75, "Rare", "Vitality becomes second nature.", 150, 12),
  ("Greater Essence of vigor", "player_flat_health", "Drag onto die - Suffix - rolls 222-300 Max Health ♥", 100, "Epic", "You are a fortress of flesh.", 300, 12),
  ("Perfect Essence of vigor", "player_flat_health", "Drag onto die - Suffix - rolls 391-450 Max Health ♥", 150, "Legendary", "Life itself kneels to your will.", 500, 12),

  -- Essence of Fortitude (+ % max health)
  ("Lesser Essence of fortitude", "player_max_health_percent", "Drag onto die - Suffix - rolls 2-6 Max Health % ♡", 2, "Common", "A faint bulwark forms within.", 50, 12),
  ("Mediocre Essence of fortitude", "player_max_health_percent", "Drag onto die - Suffix - rolls 5-12 Max Health % ♡", 4, "Uncommon", "Your limits stretch outward.", 100, 12),
  ("Refined Essence of fortitude", "player_max_health_percent", "Drag onto die - Suffix - rolls 10-18 Max Health % ♡", 6, "Rare", "Endurance reshapes your frame.", 150, 12),
  ("Greater Essence of fortitude", "player_max_health_percent", "Drag onto die - Suffix - rolls 17-24 Max Health % ♡", 8, "Epic", "You outgrow mortal bounds.", 300, 12),
  ("Perfect Essence of fortitude", "player_max_health_percent", "Drag onto die - Suffix - rolls 31-36 Max Health % ♡", 12, "Legendary", "Your life pool becomes an ocean.", 500, 12),

  -- Essence of Sunder (+ DR penetration)
  ("Lesser Essence of sunder", "damage_reduction_penetration", "Drag onto die - Prefix - rolls 2-6 DR Penetration ⚔", 2, "Common", "Armor feels thinner already.", 50, 12),
  ("Mediocre Essence of sunder", "damage_reduction_penetration", "Drag onto die - Prefix - rolls 5-12 DR Penetration ⚔", 4, "Uncommon", "Defenses crack before you strike.", 100, 12),
  ("Refined Essence of sunder", "damage_reduction_penetration", "Drag onto die - Prefix - rolls 10-18 DR Penetration ⚔", 6, "Rare", "You carve through resistance.", 150, 12),
  ("Greater Essence of sunder", "damage_reduction_penetration", "Drag onto die - Prefix - rolls 17-24 DR Penetration ⚔", 8, "Epic", "No shell can hide from you.", 300, 12),
  ("Perfect Essence of sunder", "damage_reduction_penetration", "Drag onto die - Prefix - rolls 31-36 DR Penetration ⚔", 12, "Legendary", "You unmake every ward.", 500, 12),

  -- Essence of Renewal (+ life regen per turn)
  ("Lesser Essence of renewal", "player_life_regen", "Drag onto die - Suffix - rolls 3-9 Life Regen / turn ✚", 3, "Common", "Wounds close in quiet moments.", 50, 12),
  ("Mediocre Essence of renewal", "player_life_regen", "Drag onto die - Suffix - rolls 8-18 Life Regen / turn ✚", 6, "Uncommon", "Breath returns between blows.", 100, 12),
  ("Refined Essence of renewal", "player_life_regen", "Drag onto die - Suffix - rolls 18-30 Life Regen / turn ✚", 10, "Rare", "Your pulse mends what breaks.", 150, 12),
  ("Greater Essence of renewal", "player_life_regen", "Drag onto die - Suffix - rolls 33-45 Life Regen / turn ✚", 15, "Epic", "Recovery outpaces ruin.", 300, 12),
  ("Perfect Essence of renewal", "player_life_regen", "Drag onto die - Suffix - rolls 65-75 Life Regen / turn ✚", 25, "Legendary", "Death must wait its turn.", 500, 12),

  -- Essence of Haste (+ speed per turn)
  ("Lesser Essence of haste", "player_speed_bonus", "Drag onto die - Suffix - rolls 1-3 Combat Speed ⚡", 1, "Common", "Your reflexes sharpen slightly.", 50, 12),
  ("Mediocre Essence of haste", "player_speed_bonus", "Drag onto die - Suffix - rolls 1-3 Combat Speed ⚡", 1, "Uncommon", "You strike before thought catches up.", 100, 12),
  ("Refined Essence of haste", "player_speed_bonus", "Drag onto die - Suffix - rolls 3-6 Combat Speed ⚡", 2, "Rare", "Momentum becomes a second weapon.", 150, 12),
  ("Greater Essence of haste", "player_speed_bonus", "Drag onto die - Suffix - rolls 4-6 Combat Speed ⚡", 2, "Epic", "The abyss cannot keep pace.", 300, 12),
  ("Perfect Essence of haste", "player_speed_bonus", "Drag onto die - Suffix - rolls 7-9 Combat Speed ⚡", 3, "Legendary", "You are a storm between heartbeats.", 500, 12),

  -- Essence of Might (+ % increased flat damage)
  ("Lesser Essence of might", "dice_flat_damage_percent", "Drag onto die - Prefix - rolls 5-15 Increased Flat Damage %", 5, "Common", "A faint edge sharpens every blow.", 50, 12),
  ("Mediocre Essence of might", "dice_flat_damage_percent", "Drag onto die - Prefix - rolls 10-30 Increased Flat Damage %", 10, "Uncommon", "Force gathers behind your rolls.", 100, 12),
  ("Refined Essence of might", "dice_flat_damage_percent", "Drag onto die - Prefix - rolls 20-60 Increased Flat Damage %", 20, "Rare", "Your die strikes with weight.", 150, 12),
  ("Greater Essence of might", "dice_flat_damage_percent", "Drag onto die - Prefix - rolls 35-105 Increased Flat Damage %", 35, "Epic", "Momentum reshapes each outcome.", 300, 12),
  ("Perfect Essence of might", "dice_flat_damage_percent", "Drag onto die - Prefix - rolls 130-200 Increased Flat Damage %", 67, "Legendary", "Every roll hits like a siege engine.", 500, 12),

  -- Essence of Edge (+ flat damage per roll)
  ("Lesser Essence of edge", "dice_flat_damage_roll", "Drag onto die - Prefix - rolls 1-3 Flat Damage per Roll (+1-3 per roll)", 1, "Common", "A hairline cut on fate itself.", 50, 12),
  ("Mediocre Essence of edge", "dice_flat_damage_roll", "Drag onto die - Prefix - rolls 1-6 Flat Damage per Roll (+1-6 per roll)", 2, "Uncommon", "Each face lands a little harder.", 100, 12),
  ("Refined Essence of edge", "dice_flat_damage_roll", "Drag onto die - Prefix - rolls 5-15 Flat Damage per Roll (+1-15 per roll)", 5, "Rare", "Steel follows every tumble.", 150, 12),
  ("Greater Essence of edge", "dice_flat_damage_roll", "Drag onto die - Prefix - rolls 20-60 Flat Damage per Roll (+1-60 per roll)", 20, "Epic", "Your die leaves wounds in probability.", 300, 12),
  ("Perfect Essence of edge", "dice_flat_damage_roll", "Drag onto die - Prefix - rolls 130-150 Flat Damage per Roll (+130-150 per roll)", 50, "Legendary", "Every roll carries ruin.", 500, 12),

  -- Equippable dice (monster drops)
  ("Basic Die", "equip_dice", "Equip for delves - balanced faces - item level on drop - 0-6 sockets", 0, "Common", "Every delver begins with a humble cube.", 0, 0),
  ("Crimson Die", "equip_dice", "Equip - high crit implicit - roll-based flat damage per face - 0-6 sockets", 0, "Uncommon", "A blood-stained cube that hungers for critical strikes.", 0, 100),
  ("Bone Die", "equip_dice", "Equip - 8 rolls per attack - item level on drop - 0-6 sockets", 0, "Uncommon", "Carved from a fallen delver's remains.", 0, 100),
  ("Copper Die", "equip_dice", "Equip - duplication focus - item level on drop - 0-6 sockets", 0, "Uncommon", "Warm metal that echoes every lucky roll.", 0, 100);

  INSERT INTO dice_gear
    (loot_id, image_key, side_1, side_2, side_3, side_4, side_5, side_6, no_of_rolls, duplication_chance, duplication_number, crit_chance, crit_power, flat_damage)
  SELECT l.id, 'dice1', 10, 10, 10, 10, 10, 10, 5, 5, 1, 10, 200, 0 FROM loot l WHERE l.name = 'Basic Die';

  INSERT INTO dice_gear
    (loot_id, image_key, side_1, side_2, side_3, side_4, side_5, side_6, no_of_rolls, duplication_chance, duplication_number, crit_chance, crit_power, flat_damage)
  SELECT l.id, 'dice1', 10, 10, 10, 10, 10, 10, 5, 5, 1, 18, 240, 5 FROM loot l WHERE l.name = 'Crimson Die';

  INSERT INTO dice_gear
    (loot_id, image_key, side_1, side_2, side_3, side_4, side_5, side_6, no_of_rolls, duplication_chance, duplication_number, crit_chance, crit_power, flat_damage)
  SELECT l.id, 'dice1', 10, 10, 10, 10, 10, 10, 8, 5, 1, 10, 200, 2 FROM loot l WHERE l.name = 'Bone Die';

  INSERT INTO dice_gear
    (loot_id, image_key, side_1, side_2, side_3, side_4, side_5, side_6, no_of_rolls, duplication_chance, duplication_number, crit_chance, crit_power, flat_damage)
  SELECT l.id, 'dice1', 10, 10, 10, 10, 10, 10, 5, 12, 2, 10, 200, 3 FROM loot l WHERE l.name = 'Copper Die';
  `;

		pool.query(SQLSTATEMENT, callback);
	}
});
