const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix Windows Node.js v22+ jest-worker spawn UNKNOWN error by configuring worker limit
config.maxWorkers = 2;

module.exports = config;
