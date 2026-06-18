const pool = require('../services/db');

const NEW_MODIFIERS = [
	['Speedy', 'Multiplies monster attack speed by 1.5×.', 25],
	['Bloodthirsty', 'Increases monster critical hit chance.', 25],
	['Deadly', 'Increases monster critical hit damage.', 25],
	['Echoing', 'Increases the chance for monster dice to duplicate.', 20],
	['Prolific', 'Increases how many times monster dice can duplicate.', 15],
	['Savage', 'Monster attacks roll with bonus level scaling.', 20],
];

function removeSubtracting(callback) {
	pool.query(`DELETE FROM monster_modifiers WHERE name = 'Subtracting'`, (error) => {
		if (error) return callback(error);
		console.log('Removed Subtracting modifier.');
		callback(null);
	});
}

function insertNewModifiers(index = 0, callback) {
	if (index >= NEW_MODIFIERS.length) {
		return callback(null);
	}

	const [name, description, weight] = NEW_MODIFIERS[index];
	pool.query(
		`INSERT INTO monster_modifiers (name, description, weight)
     SELECT ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM monster_modifiers WHERE name = ?)`,
		[name, description, weight, name],
		(error) => {
			if (error) return callback(error);
			console.log(`Ensured modifier exists: ${name}`);
			insertNewModifiers(index + 1, callback);
		}
	);
}

removeSubtracting((removeError) => {
	if (removeError) {
		console.error('Monster modifier migration failed:', removeError.message);
		process.exit(1);
	}

	insertNewModifiers(0, (insertError) => {
		if (insertError) {
			console.error('Monster modifier migration failed:', insertError.message);
			process.exit(1);
		}

		console.log('Monster modifiers migrated successfully.');
		process.exit(0);
	});
});
