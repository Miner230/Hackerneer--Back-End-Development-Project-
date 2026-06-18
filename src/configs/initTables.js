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
  DROP TABLE IF EXISTS user;

  DROP TABLE IF EXISTS inventory;

  DROP TABLE IF EXISTS loot;

  DROP TABLE IF EXISTS vulnerability;

  DROP TABLE IF EXISTS monsters;

  DROP TABLE IF EXISTS monster_modifiers;

  DROP TABLE IF EXISTS delve_modifiers;

  DROP TABLE IF EXISTS report;

  DROP TABLE IF EXISTS review;

  DROP TABLE IF EXISTS dice;

  DROP TABLE IF EXISTS delve_instances;

  CREATE TABLE user (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      reputation BIGINT DEFAULT 0,
      rep_multi DECIMAL(10,4) DEFAULT 1.0000,
      level INT DEFAULT 1,
      level_up_cost BIGINT DEFAULT 100,
      voidstone_count INT DEFAULT 0,
      loot_shard INT DEFAULT 0,
      number_of_delve_completed INT DEFAULT 0
  );

  CREATE TABLE inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      loot_id INT NOT NULL,
      quantity INT NOT NULL,
      UNIQUE(user_id, loot_id)
  );

  CREATE TABLE vulnerability (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      points INT NOT NULL
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

  CREATE TABLE report (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    closer_id INT NOT NULL DEFAULT 0,
    vulnerability_id INT NOT NULL,
    status BOOLEAN NOT NULL DEFAULT 0,
    details TEXT NOT NULL,
    solution TEXT NOT NULL
  );

  CREATE TABLE review (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    report_id INT NOT NULL,
    rating INT NOT NULL,
    response TEXT NOT NULL
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
      crit_power INT DEFAULT 200
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
    modifier_id INT NOT NULL
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

  INSERT INTO user (username, password, reputation, rep_multi, level, level_up_cost, voidstone_count, loot_shard, number_of_delve_completed)
  VALUES 
  ("Admin", '${hash}', 500000, 1.03, 300, 300, 1, 10, 5),
  ("KingCow", '${hash}', 500000000, 1.03, 1000, 300, 10, 1000000, 5),
  ("Fabiheeheehaahaa", '${hash}', 50, 1.03, 3, 300, 10, 1000000, 5),
  ("LackOfMoney", '${hash}', 0, 1.03, 5, 300, 10, 1000000, 5),
  ("Deevashz2007", '${hash}', 5000, 1.03, 100, 300, 10, 1000000, 5),
  ("CharlesBurger", '${hash}', 500, 1.03, 10, 300, 10, 1000000, 5);

  INSERT INTO dice (user_id, side_1, side_2, side_3, side_4, side_5, side_6, no_of_rolls, duplication_chance, duplication_number, crit_chance, crit_power)
  VALUES 
  (1, 10, 10, 10, 10, 10, 10, 5, 100, 1, 100, 20000),
  (2, 10, 10, 10, 10, 10, 10, 13, 100, 7, 100, 2200);

  INSERT INTO vulnerability (type, description, points)
  VALUES 
  ("XSS", "Allows attackers to inject malicious scripts into web pages.", 200),
  ("SQL Injection", "Lets attackers manipulate databases via malicious SQL in input fields.", 200),
  ("CSRF", "Tricks users into performing unintended actions while authenticated.", 200),
  ("Open Redirect", "Lets users control redirect URLs, potentially enabling phishing or malware.", 200),
  ("Command Injection Attack", "Executes system commands via insecurely handled user input.", 300),
  ("Insecure Direct Object Reference", "Lets attackers access unauthorized resources by changing input values.", 150),
  ("Local File Inclusion", "Includes server files via user input, revealing data or enabling code execution.", 250),
  ("Remote File Inclusion", "Executes external code by manipulating file inclusion paths.", 300),
  ("Broken Authentication Mechanism", "Weak auth logic allows session hijacking, token reuse, etc.", 200),
  ("Sensitive Data Exposure", "Sensitive info like passwords or credit cards is exposed or weakly protected.", 150),
  ("Clickjacking Vulnerability", "Tricks users into clicking hidden UI elements, triggering unintended actions.", 200),
  ("Security Misconfiguration", "Defaults, open access, or exposed admin panels make apps easier to exploit.", 200),
  ("Directory Path Traversal", "Accesses restricted files by manipulating path input (e.g., ../etc/passwd).", 250),
  ("Weak Password Policy Enforcement", "Allows simple or guessable passwords, increasing brute-force risk.", 200),
  ("Missing Login Rate Limiting", "No cap on login attempts enables brute-force password guessing.", 200),
  ("Hardcoded Authentication Credentials", "Stored credentials in code can be extracted by attackers.", 150),
  ("Unrestricted File Upload Flaw", "Uploads without validation can lead to server compromise.", 300),
  ("Broken Access Control", "Grants users unintended access to resources or actions.", 250),
  ("Improper Input Validation", "Unvalidated input may lead to injection, crashes, or data issues.", 100),
  ("Exposed .git Directory", "Public .git folders let attackers download code and sensitive info.", 150),
  ("Leaked API Key", "Public API keys allow attackers to abuse services or extract data.", 200);
  
  INSERT INTO report (user_id, closer_id, vulnerability_id, status, details, solution) VALUES
  (1, 1, 1, 1, 'XSS vulnerability on product page review form.', 'Sanitize and encode output to prevent script execution.'),
  (1, 1, 2, 1, 'SQL Injection in search box revealed database entries.', 'Use parameterized queries to prevent SQL injection.'),
  (1, 1, 3, 0, 'CSRF found on account deletion form.', 'Implement CSRF tokens and verify origin headers.'),
  (1, 1, 4, 1, 'Open Redirect in reset-password endpoint.', 'Validate and restrict redirect URLs to internal domains.'),
  (1, 1, 5, 0, 'Command injection in user profile image upload tool.', 'Use allow-lists and proper input sanitization.'),
  (1, 1, 6, 1, 'IDOR vulnerability lets attackers access invoices of others.', 'Apply proper access control checks per resource.'),
  (1, 1, 7, 1, 'LFI lets users read /etc/passwd via crafted input.', 'Restrict file paths and sanitize user input.'),
  (1, 1, 8, 0, 'RFI vulnerability detected in theme selection module.', 'Disable remote file fetching and validate include paths.'),
  (1, 1, 9, 1, 'Broken authentication allowed reuse of expired session tokens.', 'Expire sessions on logout and use secure token generation.'),
  (1, 1, 10, 0, 'Sensitive credit card info exposed in network traffic.', 'Use HTTPS and apply proper encryption.'),
  (1, 1, 11, 1, 'Clickjacking vulnerability on dashboard page.', 'Add X-Frame-Options and CSP headers.'),
  (1, 1, 12, 0, 'Admin panel publicly accessible with default credentials.', 'Restrict access and change default settings.'),
  (1, 1, 13, 1, 'Path traversal exposes config files.', 'Normalize paths and restrict user-supplied file input.'),
  (1, 1, 14, 0, 'No password policy enforced during registration.', 'Implement strong password complexity rules.'),
  (1, 1, 15, 1, 'No rate limit on login attempts enables brute-force.', 'Apply rate limiting and CAPTCHA protection.'),
  (1, 1, 16, 1, 'Source code contains hardcoded credentials.', 'Move secrets to secure vaults and environment variables.'),
  (1, 1, 17, 0, 'File upload allows .php files without validation.', 'Restrict file types and validate MIME types.'),
  (1, 1, 18, 1, 'Access control missing on /admin/settings endpoint.', 'Use role-based access control and authorization checks.'),
  (1, 1, 19, 0, 'Improper input validation in signup form causes crashes.', 'Validate input format and sanitize values.'),
  (1, 1, 20, 1, '.git directory exposed in web root.', 'Remove .git from production or deny access via .htaccess.'),
  (1, 1, 21, 0, 'Public repo exposed API key used in production.', 'Revoke and rotate API key, move secrets to config store.');
  
  INSERT INTO review (user_id, report_id, rating, response) VALUES
  (1, 1, 5, 'Very well documented. Clear description of the XSS impact and solution.'),
  (2, 1, 5, 'Terrific!. Clear description of the XSS impact and solution.'),
  (1, 2, 4, 'Good catch on the SQL injection. Consider adding test cases.'),
  (1, 3, 3, 'CSRF write-up is decent but lacks mitigation examples.'),
  (1, 4, 5, 'Excellent explanation and reasoning for open redirect fix.'),
  (1, 5, 4, 'Command injection discovery is critical. More evidence would help.'),
  (1, 6, 5, 'IDOR report is precise and shows good understanding of access control.'),
  (1, 7, 4, 'LFI report is well written, though logs could have supported the claim.'),
  (1, 8, 3, 'RFI description is fine, but mitigation advice is too generic.'),
  (1, 9, 5, 'Solid breakdown of the session issue and proposed secure design.'),
  (1, 10, 2, 'Sensitive data exposure issue needs more context and impact assessment.');


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
  ("Lesser Voidstone", "enemy_level", "+1 to enemy level", 1, "Common", "Stare into the void.", 500, 200),
  ("Mediocre Voidstone", "enemy_level", "+2 to enemy level", 2, "Uncommon", "The void stirs slightly.", 1000, 100),
  ("Refined Voidstone", "enemy_level", "+3 to enemy level", 3, "Rare", "The void whispers back.", 1500, 50),
  ("Greater Voidstone", "enemy_level", "+4 to enemy level", 4, "Epic", "The void begins to take form.", 3000, 10),
  ("Perfect Voidstone", "enemy_level", "+5 to enemy level", 5, "Legendary", "It has learnt to stare back...", 5000, 1),

  -- Essence of Fear (+ to critical chance)
  ("Lesser Essence of fear", "crit_chance", "+1 to critical chance ☣", 1, "Common", "Fear is a whisper.", 50, 200),
  ("Mediocre Essence of fear", "crit_chance", "+2 to critical chance ☣", 2, "Uncommon", "Fear grows near.", 100, 100),
  ("Refined Essence of fear", "crit_chance", "+3 to critical chance ☣", 3, "Rare", "Fear sharpens your instincts.", 150, 50),
  ("Greater Essence of fear", "crit_chance", "+4 to critical chance ☣", 4, "Epic", "Fear dominates the senses.", 300, 10),
  ("Perfect Essence of fear", "crit_chance", "+5 to critical chance ☣", 5, "Legendary", "Fear becomes real.", 500, 1),

  -- Essence of Chase (+ to critical power)
  ("Lesser Essence of chase", "crit_power", "+10 to critical power ☠︎", 10, "Common", "The hunt begins.", 50, 200),
  ("Mediocre Essence of chase", "crit_power", "+20 to critical power ☠︎", 20, "Uncommon", "The prey is close.", 100, 100),
  ("Refined Essence of chase", "crit_power", "+30 to critical power ☠︎", 30, "Rare", "The thrill intensifies.", 150, 50),
  ("Greater Essence of chase", "crit_power", "+40 to critical power ☠︎", 40, "Epic", "You see only the target.", 300, 10),
  ("Perfect Essence of chase", "crit_power", "+50 to critical power ☠︎", 50, "Legendary", "You are the hunt incarnate.", 500, 1),

  -- Essence of Mind (+ to duplication chance)
  ("Lesser Essence of mind", "duplication_chance", "+1 to duplication chance ☆", 1, "Common", "The mind is all you need.", 50, 200),
  ("Mediocre Essence of mind", "duplication_chance", "+2 to duplication chance ☆", 2, "Uncommon", "Thoughts begin to fracture.", 100, 100),
  ("Refined Essence of mind", "duplication_chance", "+3 to duplication chance ☆", 3, "Rare", "Ideas multiply effortlessly.", 150, 50),
  ("Greater Essence of mind", "duplication_chance", "+4 to duplication chance ☆", 4, "Epic", "Your mind shapes the void.", 300, 10),
  ("Perfect Essence of mind", "duplication_chance", "+5 to duplication chance ☆", 5, "Legendary", "The mind bends the world to your will.", 500, 1),

  -- Essence of Echoing (+ to duplication number)
  ("Lesser Essence of echoing", "duplication_number", "+1 to duplication number ✵", 1, "Common", "A faint ripple echoes reality.", 50, 200),
  ("Mediocre Essence of echoing", "duplication_number", "+2 to duplication number ✵", 2, "Uncommon", "One becomes two.", 100, 100),
  ("Refined Essence of echoing", "duplication_number", "+3 to duplication number ✵", 3, "Rare", "Copies echo from your will.", 150, 50),
  ("Greater Essence of echoing", "duplication_number", "+4 to duplication number ✵", 4, "Epic", "You wield infinite reflections.", 300, 10),
  ("Perfect Essence of echoing", "duplication_number", "+5 to duplication number ✵", 5, "Legendary", "What was once one now swarms.", 500, 1),
  
  -- Stones of Weighting (increase weight of a specific dice face)
  ("Stone of Weighting I", "face_1", "+1 weight to face 1", 1, "Common", "The first path grows heavier.", 50, 200),
  ("Stone of Weighting II", "face_2", "+1 weight to face 2", 1, "Common", "Two choices lie ahead.", 50, 200),
  ("Stone of Weighting III", "face_3", "+1 weight to face 3", 1, "Common", "Three is the number of balance.", 50, 200),
  ("Stone of Weighting IV", "face_4", "+1 weight to face 4", 1, "Common", "Four corners shape the world.", 50, 200),
  ("Stone of Weighting V", "face_5", "+1 weight to face 5", 1, "Common", "Five stars shine above.", 50, 200),
  ("Stone of Weighting VI", "face_6", "+1 weight to face 6", 1, "Common", "Six seals hold power.", 50, 200),

  ("Balanced Stone I", "face_1", "+3 weight to face 1", 3, "Rare", "Your fate leans toward the first.", 150, 50),
  ("Balanced Stone II", "face_2", "+3 weight to face 2", 3, "Rare", "The second outcome draws near.", 150, 50),
  ("Balanced Stone III", "face_3", "+3 weight to face 3", 3, "Rare", "You hear the call of three.", 150, 50),
  ("Balanced Stone IV", "face_4", "+3 weight to face 4", 3, "Rare", "Four is your guiding star.", 150, 50),
  ("Balanced Stone V", "face_5", "+3 weight to face 5", 3, "Rare", "Five pushes against the odds.", 150, 50),
  ("Balanced Stone VI", "face_6", "+3 weight to face 6", 3, "Rare", "Six draws destiny in your favor.", 150, 50),

  ("Stone of Dominion I", "face_1", "+5 weight to face 1", 5, "Legendary", "One dominates all outcomes.", 500, 1),
  ("Stone of Dominion II", "face_2", "+5 weight to face 2", 5, "Legendary", "Two bends the thread of chance.", 500, 1),
  ("Stone of Dominion III", "face_3", "+5 weight to face 3", 5, "Legendary", "Three carves its mark on fate.", 500, 1),
  ("Stone of Dominion IV", "face_4", "+5 weight to face 4", 5, "Legendary", "Four reshapes the world.", 500, 1),
  ("Stone of Dominion V", "face_5", "+5 weight to face 5", 5, "Legendary", "Five becomes inevitable.", 500, 1),
  ("Stone of Dominion VI", "face_6", "+5 weight to face 6", 5, "Legendary", "Six commands the dice.", 500, 1);
  `;

		pool.query(SQLSTATEMENT, callback);
	}
});
