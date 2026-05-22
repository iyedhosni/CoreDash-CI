// config/grafana.config.js
require('dotenv').config();

module.exports = {
  baseUrl: process.env.GRAFANA_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.GRAFANA_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
};
