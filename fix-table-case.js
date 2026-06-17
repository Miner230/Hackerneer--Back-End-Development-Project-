const fs = require("fs");
const path = require("path");

const root = path.join(process.cwd(), "src");

const tableMap = [
  ["Delve_Instances", "delve_instances"],
  ["Delve_Modifiers", "delve_modifiers"],
  ["Monster_Modifiers", "monster_modifiers"],
  ["Vulnerability", "vulnerability"],
  ["Inventory", "inventory"],
  ["Monsters", "monsters"],
  ["Report", "report"],
  ["Review", "review"],
  ["Dice", "dice"],
  ["Loot", "loot"],
  ["User", "user"],
];

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      files = files.concat(walk(full));
    } else if (full.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

function escRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const files = walk(root);
let total = 0;

for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  let updated = text;
  let count = 0;

  for (const [oldName, newName] of tableMap) {
    const oldEsc = escRegex(oldName);

    const replacements = [
      // FROM Report / JOIN Monsters / UPDATE Dice / REFERENCES User
      [new RegExp(`\\b(FROM|JOIN|INTO|UPDATE|REFERENCES)\\s+\`?${oldEsc}\`?\\b`, "g"), `$1 ${newName}`],

      // INSERT INTO Dice / CREATE TABLE Report / DROP TABLE IF EXISTS Review
      [new RegExp(`\\b(INSERT\\s+INTO|DELETE\\s+FROM|CREATE\\s+TABLE|DROP\\s+TABLE\\s+IF\\s+EXISTS|ALTER\\s+TABLE|TRUNCATE\\s+TABLE)\\s+\`?${oldEsc}\`?\\b`, "g"), `$1 ${newName}`],

      // Report.id / Dice.user_id / Vulnerability.type
      [new RegExp(`\\b${oldEsc}\\.`, "g"), `${newName}.`],
    ];

    for (const [pattern, replacement] of replacements) {
      const matches = updated.match(pattern);
      if (matches) count += matches.length;
      updated = updated.replace(pattern, replacement);
    }
  }

  if (updated !== text) {
    fs.writeFileSync(file, updated, "utf8");
    total += count;
    console.log(`Updated ${path.relative(process.cwd(), file)} (${count} replacements)`);
  }
}

console.log(`Total replacements: ${total}`);
