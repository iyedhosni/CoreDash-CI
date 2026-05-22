const express = require('express');
const router = express.Router();
const controller = require('../controllers/githubTrackerController');

router.get('/', controller.getRepositories);
router.post('/', controller.addRepository);
router.patch('/:name/status', controller.updateRepositoryStatus);
router.patch('/:name/priority', controller.updateRepositoryPriority);
router.delete('/:name', controller.deleteRepository); 
router.get('/details', controller.fetchRepositoryDetails);

module.exports = router;