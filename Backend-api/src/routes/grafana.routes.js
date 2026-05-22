// grafana.routes.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const router = express.Router();

const GRAFANA_URL = process.env.GRAFANA_URL; // http://192.168.1.72:32080

router.use(
  '/',
  createProxyMiddleware({
    target: GRAFANA_URL,
    changeOrigin: true,
    secure: false,
    logLevel: 'info',
  })
);

module.exports = router;
