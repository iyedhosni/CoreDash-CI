// src/routes/nexus.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/nexus.controller');

// Repositories
router.get   ('/repositories',        ctrl.listRepositories);
router.get   ('/repositories/:name',  ctrl.getRepository);
router.post  ('/repositories',        ctrl.createRepository);
router.put   ('/repositories/:name',  ctrl.updateRepository);
router.delete('/repositories/:name',  ctrl.deleteRepository);

// Search & Assets
router.get('/search', ctrl.searchComponents);
router.get('/assets', ctrl.listAssets);

// Scripts
router.get   ('/scripts',            ctrl.listScripts);
router.post  ('/scripts',            ctrl.createScript);
router.post  ('/scripts/:name/run',  ctrl.runScript);
router.delete('/scripts/:name',      ctrl.deleteScript);

// Tasks
router.get   ('/tasks',              ctrl.listTasks);
router.get   ('/tasks/:id',          ctrl.getTask);
router.post  ('/tasks/:id/run',      ctrl.runTask);

//ProjectFiles
router.get('/project-files/:projectKey', ctrl.getProjectFiles);


module.exports = router;
