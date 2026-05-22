require('dotenv').config();

module.exports = {
  baseUrl: "https://192.168.1.72:6443",
  token: process.env.KUBERNETES_TOKEN,
};
