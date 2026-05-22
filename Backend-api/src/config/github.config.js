// src/config/github.config.js
require('dotenv').config();

module.exports = {
  token: process.env.GITHUB_TOKEN,
  baseUrl: 'https://api.github.com'
};
