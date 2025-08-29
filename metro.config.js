const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add this to handle the issue with Firebase
config.resolver.sourceExts.push('cjs');

module.exports = config;