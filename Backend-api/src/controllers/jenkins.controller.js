const svc = require('../services/jenkins.service');

exports.getInfo = async (req, res, next) => {
  try { res.json(await svc.info()); }
  catch (err) { next(err); }
};

exports.getJobs = async (req, res, next) => {
  try { res.json(await svc.listJobs()); }
  catch (err) { next(err); }
};

exports.getJob = async (req, res, next) => {
  try { res.json(await svc.getJob(req.params.name)); }
  catch (err) { next(err); }
};

exports.createJob = async (req, res, next) => {
  try {
    const { name, xml } = req.body;
    if (!name || !xml) return res.status(400).json({ error: 'Missing name or xml' });
    await svc.createJob(name, xml);
    res.json({ message: `Job '${name}' created.` });
  } catch (err) { next(err); }
};

exports.updateJob = async (req, res, next) => {
  try {
    const { name } = req.params;
    const { xml } = req.body;
    if (!xml) return res.status(400).json({ error: 'Missing xml' });
    await svc.updateJobConfig(name, xml);
    res.json({ message: `Job '${name}' updated.` });
  } catch (err) { next(err); }
};

exports.deleteJob = async (req, res, next) => {
  try { await svc.deleteJob(req.params.name);
    res.json({ message: `Job '${req.params.name}' deleted.` });
  } catch (err) { next(err); }
};

exports.buildJob = async (req, res, next) => {
  try { await svc.buildJob(req.params.name, req.body);
    res.status(202).json({ message: 'Build queued.' });
  } catch (err) { next(err); }
};

exports.getBuildLog = async (req, res, next) => {
  try {
    const log = await svc.getBuildLog(req.params.name, req.params.buildNumber);
    res.send(log);
  } catch (err) { next(err); }
};
// GET /api/jenkins/job/:name/build/:number
exports.getBuildDetails = async (req, res, next) => {
  try {
    const { name, number } = req.params;
    const details = await svc.getBuildDetails(name, number);
    res.json(details);
  } catch (err) {
    next(err);
  }
};
// POST /api/jenkins/job/:name/rename
exports.renameJob = async (req, res, next) => {
  try {
    const { name }    = req.params;
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ message: 'newName is required' });
    await svc.renameJob(name, newName);
    res.json({ message: `Renamed '${name}' → '${newName}'` });
  } catch (err) {
    next(err);
  }
};
// GET /api/jenkins/job/:name/githubHookLog
// GET /api/jenkins/job/:name/githubHookLog
// GET /api/jenkins/job/:name/githubHookLog
exports.getGitHubHookLog = async (req, res, next) => {
  try {
    const text = await svc.getGitHubHookLog(req.params.name);
    res.type('text/plain').send(text);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).send('Polling has not run yet.');
    }
    next(err);
  }
};
/**
 * GET /api/jenkins/job/:name/stages
 * => [ { name: 'Build', status: 'SUCCESS' }, … ]
 */
exports.getStages = async (req, res, next) => {
  try {
    const stages = await svc.getStages(req.params.name);
    res.json(stages);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
};
exports.getJobConfig = async (req, res, next) => {
  try {
    const xml = await svc.getJobConfig(req.params.name);
    // Jenkins.client.config() returns XML string
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
};
// src/controllers/jenkins.controller.js
exports.getWorkspace = async (req, res, next) => {
  try {
    const tree = await svc.getWorkspaceTree(req.params.name);
    res.json(tree);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: `Workspace for job '${req.params.name}' not found. Ensure the job exists and has been built at least once.` });
    }
    console.error('Error fetching workspace:', err.message);
    next(err);
  }
};

exports.jenkinsWebhook = async (req, res) => {
  const io = req.app.get('socketio');

  const { jobName, status } = req.body;

  // Exemple : "STARTED", "SUCCESS", "FAILURE"
  if (!jobName || !status) {
    return res.status(400).json({ message: "Missing job info" });
    
  }

  // Crée un message personnalisé
  const message = `Le job Jenkins "${jobName}" a changé de statut : ${status}`;

  io.to('Professional DevOps').emit('notification', {
    title: `Statut Jenkins : ${status}`,
    message,
    type: 'jenkins',
    date: new Date()
  });

  res.status(200).json({ message: "Notification envoyée aux DevOps" });
};



