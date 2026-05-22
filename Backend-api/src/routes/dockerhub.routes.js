const express = require('express');
const router = express.Router();
const controller = require('../controllers/dockerhub.controller');

// List all repos
router.get('/repositories', controller.getRepos);

// Get tags of a specific repo
router.get('/repositories/:repo/tags', controller.getTags);

// Delete a repo
router.delete('/repositories/:repo', controller.deleteRepo);

// Update repo metadata (PATCH)
router.patch('/repositories/:repo', controller.updateRepo);

module.exports = router;
