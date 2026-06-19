const pool = require('../services/db');

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

columnExists('user', 'account_role', (error, exists) => {
	if (error) {
		console.error('User account role migration failed:', error.message);
		return process.exit(1);
	}

	const finish = () => {
		pool.query(
			`UPDATE user SET account_role = 'god' WHERE username = 'god'`,
			(godError) => {
				if (godError) {
					console.error('User account role migration failed:', godError.message);
					return process.exit(1);
				}

				pool.query(
					`UPDATE user SET account_role = 'admin' WHERE username = 'admin'`,
					(adminError) => {
						if (adminError) {
							console.error('User account role migration failed:', adminError.message);
							return process.exit(1);
						}

						console.log('User account_role migrated successfully.');
						process.exit(0);
					}
				);
			}
		);
	};

	if (exists) {
		return finish();
	}

	pool.query(
		`ALTER TABLE user
     ADD COLUMN account_role ENUM('user', 'admin', 'god') NOT NULL DEFAULT 'user' AFTER username`,
		(alterError) => {
			if (alterError) {
				console.error('User account role migration failed:', alterError.message);
				return process.exit(1);
			}
			finish();
		}
	);
});
