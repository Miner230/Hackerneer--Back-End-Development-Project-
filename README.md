# Dungeon Crawling Gamification System

This project is a gamified bug bounty program, which transforms bug hunting into a dungeon crawling, dice rolling rpg experience.
Users can submit and close reports to gain reputation points, which can be spent on leveling up, obtaining loot and crafting using the loot obtained from the various monsters you slay in the dungeon.

## Prerequisites

Ensure you have the following installed in the environment of your choice:

Node js, MySQL, ENV, bcrypt, jsonwebtoken, prettier

Then you can install the required node dependancies using npm install

## Available Scripts

To run the following scripts, use the command:
npm run <script-name>

1. start
   Starts the server normally using Node.js.

npm start
Use this in production or after changes youve made are complete.

2. dev
   Starts the server in development mode using nodemon, which automatically reloads the server on file changes.

npm run dev
Use this during development for a smoother workflow.

3. init_tables
   Initializes the database by running the schema and seed setup scripts.

npm run init_tables
This command executes:

src/configs/createSchema.js: Creates the schema in the SQL database

src/configs/initTables.js: Drops and creates required database tables, seeds them with data to be used for game mechanics etc

Use this script only when setting up or resetting the database structure.

4. format

npm run format
This command formats the whole project based on parameters you input into it. ENSURE THAT YOU CONFIGURE IT BASED ON YOUR VSC SETTINGS

## .env

ensure you have a .env file with the following to interact with your database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=<database-password>
DB_DATABASE=<database-name>
JWT_SECRET_KEY=<secret-key>
JWT_EXPIRES_IN=<session-expiry-time>
JWT_ALGORITHM=<hashmethod>
JWT_PEPPER=<pepper>

## Basics

The following are the most basic endpoints to use the bug bounty program.

First, most middlewares will have responseController.sendData attached.
```js
module.exports.sendData = (req, res, next) => {
	if (res.locals.code) {
		res.status(res.locals.code).json(res.locals);
	} else {
		res.status(200).json(res.locals);
	}
};
```

It allows for modular data sending, reducing the amount of fetch methods used and increasing modularity.

```bash
GET /users/userData
```

```bash
{
    "userId": 7,
    "tokenTimestamp": "2025-08-08T11:28:55.698Z",
    "user_data": [
        {
            "id": 7,
            "username": "phys",
            "level": 6,
            "level_up_cost": 489,
            "loot_shard": 1,
            "number_of_delve_completed": 8,
            "reputation": 380,
            "rep_multi": "1.3434",
            "voidstone_count": 0
        }
    ]
}
```

will fetch all user data by user id stored inside the token

```bash
GET /users/:userId
```

```json
{
   "username": "KingCow",
   "level": 1000,
   "reputation": 500000000
},
{
   "username": "Admin",
   "level": 300,
   "reputation": 500000
},
```

Fetches a specific user data for leaderboard, shows the top ten users

```bash
POST /hashing/register
```
Creates a new user in the system.
The system checks if the username already exists. If not, it creates the user, assigns a starting dice, generates token and sends it to the client.

```bash
PUT /hashing/login
```
Allows the user to login to their account

```bash
GET /vulnerabilities/ 
```

```json
{
    "vulnerabilityList": [
        {
            "id": 1,
            "type": "XSS",
            "description": "Allows attackers to inject malicious scripts into web pages.",
            "points": 200
        },
        {
            "id": 2,
            "type": "SQL Injection",
            "description": "Lets attackers manipulate databases via malicious SQL in input fields.",
            "points": 200
        },
        {
            "id": 3,
            "type": "CSRF",
            "description": "Tricks users into performing unintended actions while authenticated.",
            "points": 200
        }]
}
```


Fetches all vulnerabilities currently stored in the system.

```bash
POST /vulnerabilities/ (this is an admin command)
```

Creates a new vulnerability entry.
The system checks if the vulnerability type already exists before creating a new record.

```bash
GET /vulnerabilities/:vulId
```

```json
{
   "vulnData": 
      "id": 1,
      "type": "XSS",
      "description": "Allows attackers to inject malicious scripts into web pages.",
      "points": 200
}
```

Gets vulnerability data for specific vulnerability

```bash
GET /reports/
```

```json
"reportList": 
   {
      "id": 1,
      "user_id": 1,
      "username": "Admin",
      "vulnerability_id": 1,
      "vulnType": "XSS",
      "status": 1,
      "details": "XSS vulnerability on product page review form.",
      "solution": "Sanitize and encode output to prevent script execution"
   },
```

Fetches all reports submitted by users.

```bash
GET /reports/:reportId
```

```json
{
    "vulId": 2,
    "reportData": [
        {
            "id": 2,
            "user_id": 1,
            "closer_id": 1,
            "reporter_username": "Admin",
            "closer_username": "Admin",
            "vulnerability_id": 2,
            "vulnType": "SQL Injection",
            "status": 1,
            "details": "SQL Injection in search box revealed database entries.",
            "solution": "Use parameterized queries to prevent SQL injection."
        }
    ]
}
```

Retrieves a specific report using its unique reportId.

```bash
GET /reports/bounty
```

returns a combination of both GET /reports/ and GET /vulnerabilities/ 
Used on the bounty page to return all data in one clean fetch

```bash
POST /reports/
```

```json
{
    "userId": 7,
    "tokenTimestamp": "2025-08-08T11:28:55.698Z",
    "user_data": [
        {
            "id": 7,
            "username": "phys",
            "level": 6,
            "level_up_cost": 489,
            "loot_shard": 2,
            "number_of_delve_completed": 9,
            "reputation": 380,
            "rep_multi": "1.3434",
            "voidstone_count": 0
        }
    ],
    "reportId": 32,
    "code": 201,
    "report": {
        "message": "Successfully created report",
        "results": [
            {
                "id": 32,
                "status": 0,
                "user_id": 7,
                "vulnerability_id": 2,
                "user_reputation": 649
            }
        ]
    }
}

Required body eg: {
	"vulnerability_id": 2, // Get vulnerability ID from request body
	"details": "test"
}
```

Submits a new vulnerability report.
The system validates the user and vulnerability, then creates the report, updates the user's reputation, and returns the new report data.

```bash
PUT /reports/:reportId
```

```json
{
    "userId": 7,
    "tokenTimestamp": "2025-08-08T11:28:55.698Z",
    "user_data": [
        {
            "id": 7,
            "username": "phys",
            "level": 6,
            "level_up_cost": 489,
            "loot_shard": 2,
            "number_of_delve_completed": 9,
            "reputation": 649,
            "rep_multi": "1.3434",
            "voidstone_count": 0
        }
    ],
    "vulId": 2,
    "reportData": [
        {
            "id": 32,
            "user_id": 7,
            "closer_id": 0,
            "reporter_username": "phys",
            "closer_username": null,
            "vulnerability_id": 2,
            "vulnType": "SQL Injection",
            "status": 0,
            "details": "test",
            "solution": "none"
        }
    ],
    "report": {
        "message": "Successfully closed report",
        "results": [
            {
                "id": 32,
                "user_id": 7,
                "closer_id": 7,
                "reporter_username": "phys",
                "closer_username": "phys",
                "vulnerability_id": 2,
                "vulnType": "SQL Injection",
                "status": 1,
                "details": "test",
                "solution": "test"
            }
        ]
    }
}

required body eg: {
	"vulnerability_id": 2, // Get vulnerability ID from request body
	"solution": "test",
    "status": "1"
}
```

Updates the status of an existing report (e.g., from “0” meaning open to “1” being closed).
The system reads the report and user data, updates the status, adjusts reputation accordingly, and returns the updated report with the closer id instead of the id of the user who posted the report.

## Review system
The following are the middleware used for the review system

```bash
GET /review/:reviewId
```

```json
{
    "reviewData": [
        {
            "id": 1,
            "user_id": 1,
            "report_id": 1,
            "rating": 5,
            "response": "Very well documented. Clear description of the XSS impact and solution."
        }
    ]
}
```

Gets data on a review by id

```bash
GET /review/reports/:reportId
```

```json
{
    "reviewList": [
        {
            "id": 1,
            "user_id": 1,
            "username": "Admin",
            "report_id": 1,
            "rating": 5,
            "response": "Very well documented. Clear description of the XSS impact and solution."
        },
        {
            "id": 2,
            "user_id": 2,
            "username": "KingCow",
            "report_id": 1,
            "rating": 5,
            "response": "Terrific!. Clear description of the XSS impact and solution."
        }
    ]
}
```
This gets the list of reviews available for a single report

```bash
POST /review/reports/:reportId
```

```json
{
    "userId": 2,
    "tokenTimestamp": "2025-08-08T13:06:04.529Z",
    "message": "Successfully created review",
    "createdReview": {
        "fieldCount": 0,
        "affectedRows": 1,
        "insertId": 12,
        "info": "",
        "serverStatus": 2,
        "warningStatus": 0,
        "changedRows": 0
    },
    "code": 201
}
```
This route creates a new review for a report

```bash
PUT /review/:reviewId
```

```json
{
    "userId": 2,
    "tokenTimestamp": "2025-08-08T13:06:04.529Z",
    "message": "Successfully updated review",
    "updateReview": {
        "fieldCount": 0,
        "affectedRows": 1,
        "insertId": 0,
        "info": "Rows matched: 1  Changed: 1  Warnings: 0",
        "serverStatus": 2,
        "warningStatus": 0,
        "changedRows": 1
    }
}
```
updates review based on user ownership and the submitted review id

```bash 
DELETE /review/:reviewId
```
This route deletes a review. it should return status code 204 when successful.

```bash
GET /review/check/:reportId
```

```json
{
    "userId": 2,
    "tokenTimestamp": "2025-08-08T13:06:04.529Z",
    "reviewedStatus": true,
    "review": {
        "id": 2,
        "user_id": 2,
        "report_id": 1,
        "rating": 5,
        "response": "Terrific!. Clear description of the XSS impact and solution."
    }
}
```
Checks for reviewedStatus. If true, it sets a button on the frontend to be update instead of submit, preventing submission of reviews for the same report. If false, button defaults to submit.

## The dice

You would have noticed that for the POST /users/ route, there is the creation of a dice. This will be the main form of interaction between the player and the game. Each dice has 6 sides and various other percentage modifiers which the user can customise to their hearts content using the loot system.

```sql
CREATE TABLE Dice (
    id INT AUTO_INCREMENT PRIMARY KEY, dice id
    user_id INT NOT NULL, user id, its the id of the user who owns the dice
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
```

side_1 to side_6 stores weights for each side of the dice. Using a math calculation, the program generates a random number between 1 and the total weight of the sides added up, determining what value the dice will roll. Below is the code which generates a roll value.

```js
function rollOnce() {
	const roll = Math.floor(Math.random() * totalWeight); // Generate a random number between 0 and totalWeight
	let accumulator = 0;
	for (let i = 0; i < weights.length; i++) {
		accumulator += weights[i].weight; // Accumulate the weight of each side
		if (roll < accumulator) return weights[i].side; // Return the side when the roll is within the accumulated weight range
	}
	return null; // Return null if no valid side is found (shouldn't happen)
}
```

Weights will be very important to understand for this game. All of the randomly generated features (dice, monsters, modifiers, loot, etc) are all determined using weights. So what are weights? They are an alternative to percentages. Weights provide a more scalable method of storing the probabilities of something occuring, using integers such as 10 instead of using a percentage such as 10%. This allows for an infinite number of, for example, dice sides to be added, without having to assign each one an individual percentage chance. The calculation is also alot easier to use as shown in the above code.

However, the side a dice rolls on isnt the only thing that determine its roll values. There are two mechanics the dices also have, critical rolls and duplication. Critical rolls have a percentage chance of occuring, determined by crit_chance and will multiply the dice roll value by the crit_power as seen in the sql code above. It starts with a base chance of 10% and multiplies the roll value by two times. Duplication is the other mechanic and occurs before crit values are calculated, so keep that in mind when looking at the values your dice will roll. When the dice is duplicated, it will perform two dice rolls, which means you may be able to roll a 2 and a 6, which combines to give you a total value of 8. The chance for the dice to be duplicated is determined using duplication_chance starting at a base of 5%, and the number of duplications is determined using the duplication_number which starts at a base of 1. However, this is not all. Starting at user level 2 onward, the roll value of the dice will have a added value based on user level - 1. This provides additional scaling for the dices strength. Below will be a few examples to allow for visualizing the mechanics

"You rolled: 8 (6 + 2) from level."
This is an example of a baseline dice roll when the user is level 3. The user rolled side 6, and gained an additional value of 2 because of level.

"Rolled": "You rolled: 7 (5 + 2) from level. — Duplicated 1 time! (Rolls: 3, 2)"
This is an example of duplication. The user is level 3, therefore the roll value gets an additional value of 2. The duplicated 1 time shows that the first dice roll landed on the 3 side, and the second rolled on the 2 side.

"Rolled": "Critical roll! You rolled: 16 ((6 + 2 from level) X 2)"
This is an example of a critical roll. The user gets side 6, additional 2 value from level, and the value is multiplied by 2 to give 16.

"Rolled": "Critical roll! You rolled: 16 ((6 + 2 from level) X 2) — Duplicated 1 time! (Rolls: 4, 2)"
This is an example of all the mechanics working together as what I intend for the player to do. First, duplication occurs, rolling the dice twice for the values of 4 and 2. Then you get +2 from level, followed by multiplying that by the critical power to gain the value of 16.

```bash
GET /profile 
```

```json
{
    "userId": 7,
    "tokenTimestamp": "2025-08-08T11:28:55.698Z",
    "user_data": [
        {
            "id": 7,
            "username": "phys",
            "level": 6,
            "level_up_cost": 489,
            "loot_shard": 2,
            "number_of_delve_completed": 9,
            "reputation": 918,
            "rep_multi": "1.3434",
            "voidstone_count": 0
        }
    ],
    "rows": {
        "id": 3,
        "user_id": 7,
        "side_1": 10,
        "side_2": 10,
        "side_3": 10,
        "side_4": 10,
        "side_5": 10,
        "side_6": 10,
        "no_of_rolls": 6,
        "duplication_chance": 5,
        "duplication_number": 2,
        "crit_chance": 12,
        "crit_power": 220,
        "level": 6
    }
}
```

Allows the user to see the stats their dice has on the profile page.

The code for handling the dice rolls can be found in the src/confgs/diceCalculator.js file

## Leveling

One of the main ways for the player to increase their power is by leveling up. They can level up by spending reputation points earn from creating and closing reports. Level up cost starts at 100 reputation points, and increases by 100 reputation points with each higher level.

To level up, the user can use PUT /level/:userid, which will check if the user has enough reputation to level up, and if the user does it will increase the level by 1.

```bash
PUT /level/
```

```json
{
    "userId": 7,
    "tokenTimestamp": "2025-08-08T11:28:55.698Z",
    "user_data": [
        {
            "id": 7,
            "username": "phys",
            "level": 6,
            "level_up_cost": 489,
            "loot_shard": 2,
            "number_of_delve_completed": 9,
            "reputation": 918,
            "rep_multi": "1.3434",
            "voidstone_count": 0
        }
    ],
    "repCost": 489,
    "message": "User has leveled up to 7"
}
```

## Loot and Inventory

Loot is the other way for the player to increase their power. You can obtain loot shards by killing monsters in the delve game mode, and open them by paying a reputation cost of 150. Each piece of loot has different properties which can modify the dice or monsters you fight in different ways.
For example,

```sql
("Lesser Voidstone", "enemy_level", "+1 to enemy level", 1, "Stare into the void.", 500, 200),
```

This is one of the many items you may gain from opening loot shards. It allows you to increase the level of enemy monsters you may fight by 1.

Another example,

```sql
("Lesser Essence of fear", "crit_chance", "+2 to critical chance", 2, "Fear is a whisper.", 50, 200),
```

Another item you can get from loot shards, this one increases the crit chance of the dice.

The dice is updating using a dynamic query in loot models.

```js
module.exports.modifyByMechanics = (data, callback) => {
	const SQLSTATMENT = `
        UPDATE ??
        SET ?? = ?? + ?
        WHERE ?? = ?;
    `;
	const VALUES = [data.table, data.row, data.row, data.stat, data.indexName, data.userId];

	pool.query(SQLSTATMENT, VALUES, callback);
};
```

The list of the different values parsed through this function can be found in src/configs/mechanicMap.js
Based on the item, different tables will be modified, and the item will subsequently have its quantity turned to zero. However, the item will still be present in the users inventory but in an unuseable state.

```bash
GET /loot/claim/users/:userId
```

will return the following 
```json
"craft_cost": 150,
"message": "You claimed 1 item(s) successfully!",
"claimed": [
    {
        "message": "You claimed Lesser Essence of chase x1",
        "name": "Lesser Essence of chase",
        "id": 11,
        "rarity": "Common",
        "quantity": 1
    }
]
```

Allows a user to claim a random loot item.
It verifies the user, checks loot availability, consumes specfied amount of loot shards and required reputation and adds the loot items to the user's inventory.
The claiming process works similarily to the dice weight system, but instead of determining a side, it determines what item the user obtains from opening the loot shard.

```js
for (let i = 0; i < weightedLoot.length; i++) {
	accumulator += weightedLoot[i].weight; // Accumulate weights
	if (roll < accumulator) {
		selected = weightedLoot[i]; // Select loot once the roll falls within the current item's weight range
		break;
	}
}
```

This code determines what loot the player will obtain from opening a loot shard. Using the Lesser essence of fear example again:

```sql
("Lesser Essence of fear", "crit_chance", "+2 to critical chance", 2, "Fear is a whisper.", 50, 200),
```

The loot can be read in this format: name, mechanic, stat_description, statline, lore, craft_cost, weight.
craft cost determines how much reputation it costs to apply the stat increases from the item to the dice. Weight determines what the odds are for the user to obtain the item when claiming the loot from the loot shard.

```bash
GET /inventory
```

```json
{
    "userId": 2,
    "tokenTimestamp": "2025-08-08T13:06:04.529Z",
    "user_data": [
        {
            "id": 2,
            "username": "KingCow",
            "level": 1000,
            "level_up_cost": 300,
            "loot_shard": 990000,
            "number_of_delve_completed": 5,
            "reputation": 498499850,
            "rep_multi": "1.0300",
            "voidstone_count": 11
        }
    ],
    "inventory": [
        {
            "id": 16,
            "user_id": 2,
            "loot_id": 1,
            "quantity": 560,
            "name": "Lesser Voidstone",
            "mechanic": "enemy_level",
            "stat_description": "+1 to enemy level",
            "statline": 1,
            "lore": "Stare into the void.",
            "rarity": "Common"
        }, ...
```

Fetches the inventory of a specific user based on their userId.

```bash
PUT /inventory/:lootId
```

Uses a specific item (lootId) from a user's inventory.
This will trigger multiple actions: Validate the user, apply the item’s mechanics, deduct reputation needed to open the lootshard, which is 150 and decrease the item's quantity
If successful you should get the following response:

```json
{
    "userId": 2,
    "tokenTimestamp": "2025-08-08T13:06:04.529Z",
    "user_data": [
        {
            "id": 2,
            "username": "KingCow",
            "level": 1000,
            "level_up_cost": 300,
            "loot_shard": 990000,
            "number_of_delve_completed": 5,
            "reputation": 498500000,
            "rep_multi": "1.0300",
            "voidstone_count": 10
        }
    ],
    "itemName": "Lesser Voidstone",
    "statline": 1,
    "mechanic": "enemy_level",
    "craft_cost": 150,
    "message": "Used Lesser Voidstone to increase enemy level by 1"
}
```

## Delve

Delve is the main dungeon crawling mechanic for the game (The name is cool right?).
The Delve System allows users to enter randomized dungeon encounters by generating unique monster encounters with modifiers, applying combat rolls, and updating dungeon progress. All monster stats, loot mechanics, and combat outcomes are calculated dynamically.


These routes manage dungeon-style battles (delves), where users roll against generated monsters with modifiers. Each delve tracks progression, status, and rewards based on roll outcomes.

```bash
GET /delve/createInstance
```

```json
{
    "userId": 2,
    "tokenTimestamp": "2025-08-08T13:06:04.529Z",
    "user_data": [
        {
            "id": 2,
            "username": "KingCow",
            "level": 1000,
            "level_up_cost": 300,
            "loot_shard": 990000,
            "number_of_delve_completed": 5,
            "reputation": 498499850,
            "rep_multi": "1.0300",
            "voidstone_count": 11
        }
    ],
    "monster_data": [
        {
            "id": 1,
            "name": "Zombie",
            "description": "Slow-moving undead. Hides in dark corners, craving flesh.",
            "weight": 20
        },
        {
            "id": 2,
            "name": "Skeleton",
            "description": "A pile of bones animated by dark magic, armed with an old sword.",
            "weight": 20
        },
        ...
    ],
    "modifier_data": [
        {
            "id": 1,
            "name": "Giant",
            "description": "Doubles the monster's max HP.",
            "weight": 30
        },
        ...
    ],
    "selectedMonsters": {
        "id": 5,
        "name": "Slime",
        "description": "A blob of jelly-like goo, often found in caves or dark dungeons.",
        "weight": 20
    },
    "selectedModifiers": [
    ...
    ],
    "selectedModifierIds": [
        1,
        2,
        3,
        4,
        5
    ],
    "monsters_level": 1013,
    "monsters_health": 20260,
    "roll_attempt": 12,
    "loot_shard_count": 214,
    "modded_monster_name": "Shiny Fortified Regenerative Subtracting Giant Slime",
    "life_regen": 506,
    "damage_reduction": 80,
    "insertId": 17,
    "createdInstance": {
        "id": 17,
        "user_id": 2,
        "monster": {
            "id": 5,
            "name": "Shiny Fortified Regenerative Subtracting Giant Slime",
            "description": "A blob of jelly-like goo, often found in caves or dark dungeons."
        },
        "modifiers": [
            {
                "id": 1,
                "name": "Giant",
                "description": "Doubles the monster's max HP."
            },
            {
                "id": 2,
                "name": "Subtracting",
                "description": "Reduces the maximum number of roll attempts"
            },
            {
                "id": 3,
                "name": "Regenerative",
                "description": "Monster heals a small amount at the end of each turn."
            },
            {
                "id": 4,
                "name": "Fortified",
                "description": "Takes reduced damage."
            },
            {
                "id": 5,
                "name": "Shiny",
                "description": "Doubles reward count"
            }
        ],
        "level": 1013,
        "health": 20260,
        "life_regen": 506,
        "damage_reduction": 80,
        "roll_attempt": 12,
        "loot_shard_count": 214,
        "status": "in progress"
    }
}
```

Generates a new delve instance for a user.
This endpoint performs the following: Validates user, selects monsters and modifiers, applies scaling (level, HP, modifiers), Inserts the new delve and returns its data.

```bash
PUT /delve/:delveId/action
```

```json
"baseRolls": [
    3,
    3,
    3,
    5,
    2,
    2,
    2,
    1
],
"duplicationCount": 7,
"rollValue": 21,
"rollResult": 22440,
"isCrit": true,
"multiplier": 22,
"level_result_Modifier": 999,
"currentInstance": {
    "success": true,
    "rolled": "Critical Hit! You rolled: 22440 ((21 + 999) × 22) — Duplicated 7 times (Dice rolls: 3, 3, 3, 5, 2, 2, 2, 1)",
    "message": "Keep going!",
    "stats": {
        "level": 1013,
        "health": 2814,
        "roll_attempt": 11,
        "monster_id": 5,
        "monster_name": "Shiny Fortified Regenerative Subtracting Giant Slime",
        "life_regen": 506,
        "damage_reduction": 80,
        "modifiers": [
            {
                "id": 1,
                "name": "Giant",
                "description": "Doubles the monster's max HP."
            },
            {
                "id": 2,
                "name": "Subtracting",
                "description": "Reduces the maximum number of roll attempts"
            },
            {
                "id": 3,
                "name": "Regenerative",
                "description": "Monster heals a small amount at the end of each turn."
            },
            {
                "id": 4,
                "name": "Fortified",
                "description": "Takes reduced damage."
            },
            {
                "id": 5,
                "name": "Shiny",
                "description": "Doubles reward count"
            }
        ],
        "loot_shard_count": 214,
        "status": "in progress"
    },
    "rewards": null,
    "raw": {
        "rollResult": 22440,
        "rollValue": 21,
        "level_result_Modifier": 999,
        "isCrit": true,
        "duplicationCount": 7,
        "baseRolls": [
            3,
            3,
            3,
            5,
            2,
            2,
            2,
            1
        ],
        "multiplier": 22
    }
}

```

Rolls against an existing delve instance and updates its status.
It takes the following steps: Validates user, retrieves delve, checks if it's modifiable, rolls user's dice, applies damage calculation and updates delve, updates users loot shard amount and returns updated delve state.

Fetches all delve instances that belong to a specific user.

## Frontend

The frontend consists of **8 different pages**:  
`bounty`, `delve`, `index`, `inventory`, `logbook`, `login`, `profile`, `register`.

### Page → Entrypoint Mapping
| Page            | HTML File        |    JS Folder/File        |
|-----------------|-----------------|---------------------------|
| Index           | `index.html`    | `js/index/`               |
| Bounty          | `bounty.html`   | `js/bounty/`               |
| Delve           | `delve.html`    | `js/delve/`                |
| Inventory       | `inventory.html`| `js/inventory/`            |
| Logbook         | `logbook.html`  | `js/logbook/`              |
| Login           | `login.html`    | `loginUser.js`             |
| Register        | `register.html` | `registerUser.js`          |
| Profile         | `profile.html`  | `js/profile/`               |

Each page loads only the scripts it needs. Shared utilities live at `public/js/` root.

---

### Important Files (JavaScript)
- **`userAccountToggles.js`** – Handles logged in/out permissions, prevents forceful browsing, manages redirects.
- **`mainUtils.js`** – Modular search bar, card creator, confetti animation, and tab generation.
- **`queryCmds.js`** – Centralized `fetchMethod(...)` calls for API interaction. All pages import from here.
- **`navbar.js`** – Dynamically populates navbar and toggles nav items based on auth state.
- **`notification.js`** – Lightweight toast/notification system.
- **`getCurrentURL.js`** – Resolves API base URL (`currentUrl`).

---

### Important Files (CSS)
- `base.css` – Global resets, variables, typography.
- `animations.css` – Keyframes (fade, slide, shake, flash).
- `bountySystem.css` – RPG/dungeon theme styles.
- `dice.css` – 3D dice cube faces and roll animations.
- `game.css` – Shared game components (HP bars, overlays).
- `index.css` – Landing page hero and cards.
- `inventory.css` – Inventory grid and item overlays.
- `logbook.css` – Report/review list, filters, modals.
- `profile.css` – Profile layout, pet/stats panels.

---

### Modular Tabs Example
Tabs can be generated using the following `tabConfig`:

```js
const tabConfig = [
	{
		id: 'monster', // Tab ID
		title: 'Monsters', // Tab title
		searchPlaceholder: 'Search for monsters...', // Search bar placeholder
		searchId: 'searchBarMonster', // Search input ID
		listId: 'monsterList', // Content list container ID
	},
	{
		id: 'loot',
		title: 'Loot',
		searchPlaceholder: 'Search for loot...',
		searchId: 'searchBarloot',
		listId: 'lootList',
	},
	{
		id: 'modifiers',
		title: 'Modifiers',
		searchPlaceholder: 'Search for modifiers...',
		searchId: 'searchBarModifier',
		listId: 'modifierList',
	},
];
```

## Reports UI (Frontend Pattern)

This section documents the **report list + overlay** workflow. The same structure and conventions are used across other modules (inventory, reviews, etc.).

### Overview
- Lists reports as cards with **client-side search**.
- Opens an overlay to **view/update** a report.
- If a report is **closed**, the overlay shows **inner tabs**: _Report_ and _Reviews_.
- All network calls go through `fetchMethod(...)` (see `queryCmds.js`), with a single `callback(status, data)`.

---

### Functions

| Function | Purpose |
|---------|---------|
| `loadReportList(data)` | Renders cards to `#reportList`, wires search on `#searchBarReport`. |
| `handleSubmitNewReport(vulnId)` | Returns a submit handler that POSTs a new report for a given vulnerability. |
| `loadReportForm(reportId, token)` | GETs a single report, opens overlay, injects tabs when closed, builds dynamic form. |
| `handleSubmitReportUpdate(data)` | Returns a submit handler that PUTs `status=1` and `solution` to close/update the report. |
| `insertTabs(container)` | Adds inner Bootstrap tabs (_Report_, _Reviews_) to the overlay content. |
| `getReportFields(data, isClosed)` | Builds dynamic form fields for open/closed states. |
| `getReportButtons(isClosed)` | Returns action buttons for the form (empty when closed). |
| `setupTempContainer(container)` | Creates a hidden container to safely move the form under the tabs. |
| `reloadReportList()` | Re-fetches all reports and re-renders the list. |

---

### DOM Contracts

- **List container:** `#reportList`  
- **Search input:** `#searchBarReport`  
- **Overlay shell:** `#reportOverlay`  
- **Overlay inner content:** `.report-overlay-content`  
- **Overlay content target:** `#reportContent`  
- **Inner tab panes:** `#report-pane-inner`, `#reviews-pane-inner`  
- **Form mount point inside Report tab:** `#reportFormContainer`

> **Note:** When a report is closed, `loadReportForm` injects tabs via `insertTabs`, builds the form, and then _moves_ the form into `#reportFormContainer`.

---

### Data Requirements

`loadReportList(data)` expects an **array of report objects** with at least:

```json
{
  "id": 1,
  "vulnType": "XSS",
  "username": "alice",            // submitter
  "status": 0,                    // 0=open, 1=closed
  "details": "...",
  "reporter_username": "alice",
  "solution": null
}
```

## CREDITS
# Images 
https://www.poewiki.net/wiki/Essence
https://calamitymod.wiki.gg/wiki/Aero_Stone
Chatgpt
https://tenor.com/view/forge-anvil-hammer-gif-15913570

All images can be found https://github.com/Miner230/ca2-images