const service = require('../services/dockerhub.service');

// GET /repositories
const getRepos = async (req, res) => {
  try {
    const repos = await service.getRepositories();
    res.json(repos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
};

// GET /repositories/:repo/tags
const getTags = async (req, res) => {
  try {
    const { repo } = req.params;
    const tags = await service.getTags(repo);
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
};

// DELETE /repositories/:repo
const deleteRepo = async (req, res) => {
  try {
    const { repo } = req.params;
    const response = await service.deleteRepository(repo);
    res.json({ message: `Repository ${repo} deleted`, response });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete repository' });
  }
};

// PATCH /repositories/:repo
const updateRepo = async (req, res) => {
  try {
    const { repo } = req.params;
    const updates = req.body;
    const response = await service.updateRepository(repo, updates);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update repository' });
  }
};

module.exports = {
  getRepos,
  getTags,
  deleteRepo,
  updateRepo
};
