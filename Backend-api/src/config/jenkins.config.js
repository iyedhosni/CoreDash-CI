// src/config/jenkins.config.js
const { URL } = require('url');
const raw = process.env.JENKINS_URL;
if (!raw) throw new Error('Missing JENKINS_URL in env');

const urlObj = new URL(raw.replace(/\/+$/, ''));
urlObj.username = process.env.JENKINS_USER;
urlObj.password = process.env.JENKINS_API_TOKEN;

module.exports = {
  baseUrl: urlObj.toString(),    // e.g. 'http://user:token@198.168.1.72:8080'
  crumbIssuer: true,
  promisify: true
};
