const pool = require('../services/db');
const userDiceModel = require('../models/userDiceModel.js');
const diceModifierModel = require('../models/diceModifierModel.js');
const diceSocketModel = require('../models/diceSocketModel.js');
const {
	buildDiceItemSnapshot,
	parseStatsSnapshot,
} = require('../utils/diceItemSnapshot.js');
const { formatModifierRow, isEssenceAffixModifier } = require('../utils/diceEssenceCraft.js');
const { formatSocketRow } = require('../utils/diceSockets.js');

function columnExists(table, column, callback) {
	pool.query(
		`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
		[table, column],
		(error, results) => {
			if (error) return callback(error);
			callback(null, results.length > 0);
		}
	);
}

function addSnapshotColumn(callback) {
	columnExists('user_dice', 'stats_snapshot', (error, exists) => {
		if (error) return callback(error);
		if (exists) return callback(null);

		pool.query(
			'ALTER TABLE user_dice ADD COLUMN stats_snapshot JSON NULL AFTER drop_rarity_score',
			(alterError) => callback(alterError)
		);
	});
}

function backfillSnapshots(callback) {
	pool.query('SELECT id, user_id FROM user_dice WHERE stats_snapshot IS NULL', (error, rows) => {
		if (error) return callback(error);
		if (!rows.length) return callback(null);

		let index = 0;

		function next() {
			if (index >= rows.length) return callback(null);

			const { id, user_id: userId } = rows[index];
			index += 1;

			userDiceModel.selectById({ userId, diceInstanceId: id }, (selectError, dieRows) => {
				if (selectError) return callback(selectError);

				const dieRow = dieRows[0];
				if (!dieRow) return next();

				diceModifierModel.selectByDiceInstanceId({ userId, diceInstanceId: id }, (modError, modRows) => {
					if (modError) return callback(modError);

					diceSocketModel.selectByDiceInstanceId({ userId, diceInstanceId: id }, (sockError, sockRows) => {
						if (sockError) return callback(sockError);

						const modifiers = (modRows || [])
							.map(formatModifierRow)
							.filter(isEssenceAffixModifier);
						const sockets = (sockRows || []).map(formatSocketRow);
						const snapshot = buildDiceItemSnapshot(dieRow, modifiers, sockets);

						userDiceModel.updateStatsSnapshot(
							{ userId, diceInstanceId: id, snapshot },
							(updateError) => {
								if (updateError) return callback(updateError);
								next();
							}
						);
					});
				});
			});
		}

		next();
	});
}

addSnapshotColumn((columnError) => {
	if (columnError) {
		console.error('Failed to add stats_snapshot column:', columnError);
		process.exit(1);
	}

	backfillSnapshots((backfillError) => {
		if (backfillError) {
			console.error('Failed to backfill dice stats snapshots:', backfillError);
			process.exit(1);
		}

		console.log('Dice stats snapshot migration complete.');
		process.exit(0);
	});
});
