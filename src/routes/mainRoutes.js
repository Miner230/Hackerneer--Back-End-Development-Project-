const express = require('express');
const router = express.Router();

// Import all the route modules
const reportRoutes = require('./reportRoutes');
router.use('/reports', reportRoutes); // All routes related to reports will be prefixed with '/reports'

const userRoutes = require('./userRoutes');
router.use('/users', userRoutes); // All routes related to users will be prefixed with '/users'

const inventoryRoutes = require('./inventoryRoutes');
router.use('/inventory', inventoryRoutes); // All routes related to inventory will be prefixed with '/inventory'

const lootRoutes = require('./lootRoutes');
router.use('/loot', lootRoutes); // All routes related to loot will be prefixed with '/loot'

const vulnerabilityRoutes = require('./vulnerabilityRoutes');
router.use('/vulnerabilities', vulnerabilityRoutes); // All routes related to vulnerabilities will be prefixed with '/vulnerabilities'

const diceRoutes = require('./diceRoutes');
router.use('/dice', diceRoutes); // All routes related to dice will be prefixed with '/dice'

const levelingRoutes = require('./levelingRoutes');
router.use('/level', levelingRoutes); // All routes related to leveling will be prefixed with '/level'

const delveRoutes = require('./delveRoutes');
router.use('/delve', delveRoutes); // All routes related to delve will be prefixed with '/delve'

const hashingRoutes = require('./hashingRoutes'); // All routes related to hashing will be prefixed with '/hashing'
router.use('/hashing', hashingRoutes);

const reviewRoutes = require('./reviewRoutes'); // All routes related to hashing will be prefixed with '/review'
router.use('/review', reviewRoutes);

// Export the router to be used in the main application
module.exports = router;
