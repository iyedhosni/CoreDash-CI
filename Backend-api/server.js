// server.js
require('dotenv').config();

const cors = require('cors');
const cfg = require('./src/config/jenkins.config');
const express = require('express');
const http = require('http');
const app = require('./src/app');
const server = http.createServer(app); // wrap Express in http.Server
const svcSonarQube = require('./src/services/sonarqube.service');
const svc = require('./src/services/jenkins.service');
const svcNexus = require('./src/services/nexus.services');
const svcDockerHub = require('./src/services/dockerhub.service');
const { NotificationService, setSequelize, setSocketIO } = require('./src/services/notification.service');
const { sequelize } = require('./src/models');
const { initializeSocket } = require('./src/socket');

// Configure CORS for the Express app
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Initialize Socket.IO with our custom implementation
const io = initializeSocket(server);

// Initialize notification service with Sequelize and Socket.IO
setSequelize(sequelize);
setSocketIO(io);

// Make io available to controllers
app.set('socketio', io);

// Disable caching
app.disable('etag');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ✅ Démarrer normalement comme avant
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ API server running on http://localhost:${PORT}`);
  console.log('Jenkins base URL:',    cfg.baseUrl);
  console.log('Jenkins crumb issuer:', cfg.crumbIssuer);
  console.log('Jenkins promisify:',    cfg.promisify);
});



let lastStatuses = {};
let isFirstPoll = true;

// Import Sequelize instance

async function pollBuildStatuses() {
  const jobs = await svc.listJobs();
  for (const job of jobs) {
    if (!job.name) continue;
    const jobInfo = await svc.getJob(job.name);
    const lastBuild = jobInfo.lastBuild;
    if (!lastBuild) continue;

    const build = await svc.getBuildDetails(job.name, lastBuild.number);

    let status;
    if (build.building) {
      status = 'STARTED';
    } else if (build.result) {
      status = build.result;
    } else {
      status = 'UNKNOWN';
    }

    const key = `${job.name}#${lastBuild.number}`;

    if (lastStatuses[key] !== status) {
      if (!isFirstPoll) {
        let title, message;
        if (status === 'STARTED') {
          title = `Démarrage du build Jenkins`;
          message = `Le job Jenkins "${job.name}" a démarré le build #${lastBuild.number}.`;
        } else if (['SUCCESS', 'FAILURE', 'ABORTED', 'UNSTABLE'].includes(status)) {
          title = `Résultat du build Jenkins`;
          message = `Le build #${lastBuild.number} du job "${job.name}" est terminé avec le statut : ${status}.`;
        } else {
          title = `Statut Jenkins : ${status}`;
          message = `Le job Jenkins "${job.name}" build #${lastBuild.number} : ${status}`;
        }

        // Sauvegarde + émission
        await NotificationService.create({ title, message, type: 'jenkins', role_target: 'professional_devops' });

        io.to('professional_devops').emit('notification', {
          title,
          message,
          type: 'jenkins',
          date: new Date(),
        });
        console.log(`[Jenkins Poller] Notification sent for ${key}: ${status}`);
      }
      lastStatuses[key] = status;
    }
  }
  if (isFirstPoll) isFirstPoll = false;
}

async function pollSonarQubeEvents() {
  const response = await svcSonarQube.searchProjects(); // Fetch projects
  const projects = response.components || []; // Extract the projects array

  for (const project of projects) {
    const qualityGate = await svcSonarQube.getProjectQualityGate(project.key); // Fetch quality gate status
    const key = `${project.key}#${qualityGate.status}`;

    if (lastStatuses[key] !== qualityGate.status) {
      if (!isFirstPoll) {
        const title = `SonarQube Quality Gate`;
        const message = `Project "${project.name}" has a quality gate status: ${qualityGate.status}.`;

        // Sauvegarde + émission
        await NotificationService.create({ title, message, type: 'sonarqube', role_target: 'professional_devops' });

        io.to('professional_devops').emit('notification', {
          title,
          message,
          type: 'sonarqube',
          date: new Date(),
        });
        console.log(`[SonarQube Poller] Notification sent for ${key}: ${qualityGate.status}`);
      }
      lastStatuses[key] = qualityGate.status;
    }
  }
}

async function pollNexusEvents() {
  const repositories = await svcNexus.listRepositories(); // Replace with your service method
  for (const repo of repositories) {
    const key = `${repo.name}#${repo.status}`;

    if (lastStatuses[key] !== repo.status) { 
      if (!isFirstPoll) {
        const title = `Nexus Repository Update`;
        const message = `Repository "${repo.name}" status changed to: ${repo.status}.`;

        // Sauvegarde + émission
        await NotificationService.create({ title, message, type: 'nexus', role_target: 'professional_devops' });

        io.to('professional_devops').emit('notification', {
          title,
          message,
          type: 'nexus',
          date: new Date(),
        });
        console.log(`[Nexus Poller] Notification sent for ${key}: ${repo.status}`);
      }
      lastStatuses[key] = repo.status;
    }
  }
}

async function pollDockerHubEvents() {
  const response = await svcDockerHub.getRepositories(); // Fetch repositories
  const repositories = response.results || []; // Extract the repositories array

  for (const repo of repositories) {
    const key = `${repo.name}#${repo.status || 'unknown'}`; // Use 'unknown' if status is missing

    if (lastStatuses[key] !== repo.status) {
      if (!isFirstPoll) {
        const title = `DockerHub Repository Update`;
        const message = `Repository "${repo.name}" status changed to: ${repo.status || 'unknown'}.`;

        // Sauvegarde + émission
        await NotificationService.create({ title, message, type: 'dockerhub', role_target: 'professional_devops' });

        io.to('professional_devops').emit('notification', {
          title,
          message,
          type: 'dockerhub',
          date: new Date(),
        });
        console.log(`[DockerHub Poller] Notification sent for ${key}: ${repo.status || 'unknown'}`);
      }
      lastStatuses[key] = repo.status;
    }
  }
}
async function TESTEvents() {
  
  await NotificationService.create({ title : 'title', message: 'message', type: 'type', role_target: 'admin' });

        io.to('admin').emit('notification',  {
          title: 'title',
          message: 'message',
          type: 'type',
          date: new Date(),
        });

}

// Poll every 30 seconds
setInterval(pollBuildStatuses, 30000);
setInterval(pollSonarQubeEvents, 30000);
setInterval(pollNexusEvents, 30000);
setInterval(pollDockerHubEvents, 30000);
