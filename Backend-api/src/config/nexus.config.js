// src/config/nexus.config.js
const { URL } = require('url');

const raw = process.env.NEXUS_URL;
if (!raw) {
  throw new Error('Missing NEXUS_URL in environment');
}

// Normalize: remove trailing slash and ensure we only keep origin
const parsed = new URL(raw.replace(/\/+$/, ''));
const baseUrl = parsed.origin;

// Build auth header
let authHeader;
if (process.env.NEXUS_TOKEN) {
  authHeader = `Bearer ${process.env.NEXUS_TOKEN}`;
} else if (process.env.NEXUS_USER && process.env.NEXUS_PASSWORD) {
  authHeader = 'Basic ' +
    Buffer.from(`${process.env.NEXUS_USER}:${process.env.NEXUS_PASSWORD}`).toString('base64');
} else {
  throw new Error('Either NEXUS_TOKEN or NEXUS_USER/NEXUS_PASSWORD must be set');
}

module.exports = { baseUrl, authHeader };
