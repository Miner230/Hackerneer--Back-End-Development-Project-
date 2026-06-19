const express = require('express');
const router = express.Router();

const userRoutes = require('./userRoutes');
router.use('/users', userRoutes);

const inventoryRoutes = require('./inventoryRoutes');
router.use('/inventory', inventoryRoutes);

const lootRoutes = require('./lootRoutes');
router.use('/loot', lootRoutes);

const diceRoutes = require('./diceRoutes');
router.use('/dice', diceRoutes);

const levelingRoutes = require('./levelingRoutes');
router.use('/level', levelingRoutes);

const delveRoutes = require('./delveRoutes');
router.use('/delve', delveRoutes);

const hashingRoutes = require('./hashingRoutes');
router.use('/hashing', hashingRoutes);

module.exports = router;
