// services/grafana.service.js
const axios = require('axios');
const { baseUrl, headers } = require('../config/grafana.config');

async function getPanelImage(uid, slug, panelId) {
  const url = `${baseUrl}/render/d-solo/${uid}/${slug}?panelId=${panelId}&from=now-1h&to=now`;
  const res = await axios.get(url, {
    headers,
    responseType: 'arraybuffer', // pour recevoir l’image
  });
  return res.data;
}

module.exports = { getPanelImage };
