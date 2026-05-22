// src/config/sonarqube.config.js
const { URL } = require('url');
const raw = process.env.SONARQUBE_URL;
if (!raw) throw new Error('Missing SONARQUBE_URL in env');

const urlObj = new URL(raw.replace(/\/+$/, ''));
urlObj.username = process.env.SONARQUBE_USER || '';
urlObj.password = process.env.SONARQUBE_API_TOKEN || '';

module.exports = {
  baseUrl: urlObj.toString(),    // ex: 'http://admin:token@192.168.1.73:9000'
  apiVersion: process.env.SONARQUBE_API_VERSION || '9.9'
};
