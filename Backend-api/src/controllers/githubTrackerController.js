const { GitHubRepository } = require('../models');
const githubService = require('../services/github.service');
const { NotificationService } = require('../services/notification.service');
const { Op } = require('sequelize');

exports.getRepositories = async (req, res) => {
  try {
    const repositories = await GitHubRepository.findAll();
    res.json(repositories);
  } catch (err) {
    console.error('Error fetching repositories:', err); // Log the error
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
};

exports.addRepository = async (req, res) => {
  try {
    const { name, link, status } = req.body;
    const repository = await GitHubRepository.create({ name, link, status });
    
    // Send notification
    await NotificationService.create({
      title: 'New Repository Added',
      message: `Repository "${name}" has been added to tracking`,
      type: 'github',
      role_target: 'developpeur'
    });
    
    res.status(201).json(repository);
  } catch (err) {
    console.error('Error adding repository:', err);
    res.status(500).json({ error: 'Failed to add repository' });
  }
};

exports.updateRepositoryStatus = async (req, res) => {
  try {
    const { name } = req.params;
    const { status } = req.body;

    const repository = await GitHubRepository.findOne({ where: { name } });
    if (!repository) return res.status(404).json({ error: 'Repository not found' });

    const oldStatus = repository.status;
    repository.status = status;
    await repository.save();
    
    // Send notification
    await NotificationService.create({
      title: 'Repository Status Updated',
      message: `Status of repository "${repository.name}" changed from "${oldStatus}" to "${status}"`,
      type: 'github',
      role_target: 'developpeur'
    });
    
    res.json(repository);
  } catch (err) {
    console.error('Error updating repository status:', err);
    res.status(500).json({ error: 'Failed to update repository status' });
  }
};

exports.updateRepositoryPriority = async (req, res) => {
  try {
    const { name } = req.params;
    const { priority } = req.body;

    if (priority === undefined || typeof priority !== 'number') {
      return res.status(400).json({ error: 'Priority must be a number and is required' });
    }

    const repository = await GitHubRepository.findOne({ where: { name } });
    if (!repository) return res.status(404).json({ error: 'Repository not found' });

    const oldPriority = repository.priority;
    repository.priority = priority;
    await repository.save();
    
    // Send notification
    await NotificationService.create({
      title: 'Repository Priority Updated',
      message: `Priority of repository "${repository.name}" changed from ${oldPriority} to ${priority}`,
      type: 'github',
      role_target: 'developpeur'
    });
    
    res.json(repository);
  } catch (err) {
    console.error('Error updating repository priority:', err);
    res.status(500).json({ error: 'Failed to update repository priority' });
  }
};

exports.deleteRepository = async (req, res) => {
  try {
    const { name } = req.params;
    console.log('Deleting repository:', name);
    
    // Get repository details before deletion for notification
    const repository = await GitHubRepository.findOne({ where: { name } });
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    const deleted = await GitHubRepository.destroy({ where: { name } });
    
    // Send notification
    await NotificationService.create({
      title: 'Repository Removed',
      message: `Repository "${name}" has been removed from tracking`,
      type: 'github',
      role_target: 'developpeur'
    });
    
    res.json({ message: 'Repository deleted successfully' });
  } catch (err) {
    console.error('Error deleting repository:', err);
    res.status(500).json({ error: 'Failed to delete repository' });
  }
};

exports.fetchRepositoryDetails = async (req, res) => {
  try {
    const { owner, repo } = req.query;
    if (!owner || !repo) {
      return res.status(400).json({ error: 'Owner and repo are required' });
    }

    const details = await githubService.getRepoDetails(owner, repo);
    res.json(details);
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    console.error('Error fetching repository details:', err);
    res.status(500).json({ error: 'Failed to fetch repository details' });
  }
};