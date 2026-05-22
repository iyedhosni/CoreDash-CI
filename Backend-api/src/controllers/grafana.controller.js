const axios = require('axios');
require('dotenv').config();

const GRAFANA_URL = process.env.GRAFANA_URL; // e.g. http://192.168.1.72:32422
const GRAFANA_API_KEY = process.env.GRAFANA_API_KEY;

exports.proxyGrafanaPanel = async (req, res) => {
  const { uid, panelId } = req.query;

  if (!uid || !panelId) {
    return res.status(400).send("Missing uid or panelId");
  }

  const queryParams = new URLSearchParams({
    orgId: 1,
    refresh: '10s',
    'var-datasource': 'default',
    'var-cluster': '',
    panelId,
    from: Date.now() - 3600000, // 1h ago
    to: Date.now(),
    timezone: 'utc',
    __feature: 'dashboardSceneSolo',
  });

  const embedUrl = `${GRAFANA_URL}/d-solo/${uid}/kubernetes-compute-resources-cluster?${queryParams.toString()}`;

  try {
    const grafanaRes = await axios.get(embedUrl, {
      headers: {
        Authorization: GRAFANA_API_KEY,
      },
      responseType: 'stream',
    });

    res.setHeader('Content-Type', 'text/html');
    grafanaRes.data.pipe(res);
  } catch (error) {
    console.error("Grafana proxy error:", error.message);
    res.status(500).send("Failed to load Grafana panel");
  }
};
