const router = require('express').Router();
const ctrl   = require('../controllers/jenkins.controller');

// Info & system
router.get('/info', ctrl.getInfo);

// Job CRUD
router.get('/jobs',         ctrl.getJobs);
router.get('/job/:name',     ctrl.getJob);
router.post('/job/create',   ctrl.createJob);
router.put('/job/:name',     ctrl.updateJob);
router.delete('/job/:name',  ctrl.deleteJob);

// Builds
router.post('/job/:name/build',            ctrl.buildJob);
router.get('/job/:name/log/:buildNumber',  ctrl.getBuildLog);
router.get(
  '/job/:name/build/:number',
  ctrl.getBuildDetails
);
router.post('/job/:name/rename', ctrl.renameJob);
// after your other routes
// proxy the GitHub webhook log
router.get(
  '/job/:name/githubHookLog',
  ctrl.getGitHubHookLog
);
router.get(
  '/job/:name/stages',
  ctrl.getStages
);
router.get(
  '/job/:name/stages',
  ctrl.getStages
);
router.get('/job/:name/config', ctrl.getJobConfig);
router.post('/job/:name/config', ctrl.updateJob);
router.get('/job/:name/workspace', ctrl.getWorkspace);  

// Webhook Jenkins pour notifications DevOps
router.post('/jenkins/hook', ctrl.jenkinsWebhook);

module.exports = router;