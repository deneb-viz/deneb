const path = require('path');
const fs = require('fs');

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Import the appropriate config
const config = isDevelopment
    ? require('./webpack.dev.config')
    : require('./webpack.prod.config');

module.exports = config;
