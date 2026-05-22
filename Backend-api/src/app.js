// src/app.js
require('dotenv').config();

const express                     = require('express');
const cors                        = require('cors');
const morgan                      = require('morgan');
const path                        = require('path');
const { createProxyMiddleware }   = require('http-proxy-middleware');
const { URL }                     = require('url');

const db                          = require('./models');
const { verifyToken }             = require('./middleware/authJwt');
const errorHandler                = require('./middleware/error.handler');

const authRoutes                  = require('./routes/auth.routes');
const sonarqubeRoutes             = require('./routes/sonarqube.routes');
const dockerhubRoutes             = require('./routes/dockerhub.routes');
const jenkinsRoutes               = require('./routes/jenkins.routes');
const nexusRoutes                 = require('./routes/nexus.routes');
const githubRoutes                = require('./routes/github.routes');
const kubernetesRoutes            = require('./routes/kubernetes.routes');
const grafanaRoutes               = require('./routes/grafana.routes');
const notifRoutes                 = require('./routes/notification.routes');
const grafanaUrlRoutes            = require('./routes/grafanaRoutes');

const cfg                         = require('./config/jenkins.config');

const app = express();

// 1) CORS (before routes)
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500'
];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

// 2) Body parsing + HTTP request logging
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
// In your main app.js or server.js
app.use('/api/users', require('./routes/userRoutes'));
// 3) Public auth endpoints
app.use('/api/auth', authRoutes);

// 4) Protected SonarQube API
app.use('/api/sonarqube', verifyToken, sonarqubeRoutes);

// 5) (Optional) serve static front-end assets
// app.use(express.static(path.join(__dirname, '../public')));

// 6) Jenkins proxy (public)
/*
   Exposes /jenkins → your Jenkins server.
   Our own /api/jenkins routes are protected below.
*/
const jUrl   = new URL(cfg.baseUrl);
const target = `${jUrl.protocol}//${jUrl.host}`;
const auth   = `${jUrl.username}:${jUrl.password}`;

app.use(
  '/jenkins',
  createProxyMiddleware({
    target,
    changeOrigin: true,
    auth,
    pathRewrite: { '^/jenkins': '' },
    onProxyRes(proxyRes) {
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['content-security-policy'];
    }
  })
);

// 7) Protected internal APIs
app.use('/api/jenkins',    verifyToken, jenkinsRoutes);
app.use('/api/nexus',      verifyToken, nexusRoutes);
app.use('/api/dockerhub',  verifyToken, dockerhubRoutes);
app.use('/api/github',     verifyToken, githubRoutes);
app.use('/api/kubernetes', verifyToken, kubernetesRoutes);
app.use('/api/grafana',    verifyToken, grafanaRoutes);
app.use('/api/notifications', notifRoutes);

// 8) Public Grafana URL endpoint
app.use('/api/grafana-url', grafanaUrlRoutes);
app.use('/api/github-tracker', require('./routes/githubTracker.routes'));

// 8) Sync database (create tables if missing)
db.sequelize.sync()
  .then(() => console.log('🗄️  Database synced'))
  .catch(err => console.error('❌ DB sync error:', err));

// 9) 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 10) Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
