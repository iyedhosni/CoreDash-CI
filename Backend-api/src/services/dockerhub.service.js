const axios = require('axios');
const config = require('../config/dockerhub.config');

// Get all repositories
const getRepositories = async () => {
  const response = await axios.get(config.baseUrl, {
    headers: { Authorization: `Bearer ${config.token}` }
  });
  return response.data;
};

// Get tags for a repo
const getTags = async (repo) => {
  const url = `${config.baseUrl}/${repo}/tags`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${config.token}` }
  });
  return response.data;
};

// Delete a repository
const deleteRepository = async (repo) => {
  const url = `${config.baseUrl}/${repo}/`;
  const response = await axios.delete(url, {
    headers: { Authorization: `Bearer ${config.token}` }
  });
  return response.data;
};

// Update repo metadata (description, is_private, etc.)
const updateRepository = async (repo, updateFields) => {
  const url = `${config.baseUrl}/${repo}/`;
  const response = await axios.patch(url, updateFields, {
    headers: { Authorization: `Bearer ${config.token}` }
  });
  return response.data;
};

module.exports = {
  getRepositories,
  getTags,
  deleteRepository,
  updateRepository
};
