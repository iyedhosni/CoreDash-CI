const axios = require("axios");
const https = require("https");
const { baseUrl, token } = require("../config/kubernetes.config");

const k8s = axios.create({
  baseURL: baseUrl, // Doit être juste https://192.168.1.72:6443
  headers: {
    Authorization: `Bearer ${token}`,
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

module.exports = {
  listPods: async () => {
    const res = await k8s.get("/api/v1/namespaces/default/pods");
    return res.data;
  },
};
