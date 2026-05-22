// src/services/github.service.js
const axios = require('axios');
const cfg = require('../config/github.config');

const headers = {
  Authorization: `token ${cfg.token}`,
  'User-Agent': '3S-Platform'
};

async function listUserRepos(username) {
  try {
    const res = await axios.get(`${cfg.baseUrl}/users/${username}/repos`, { headers });
    return res.data;
  } catch (err) {
    console.error("❌ GitHub API error for repos:", err.response?.status, err.response?.data || err.message);
    throw err;
  }
}

async function getRepoDetails(owner, repo) {
  try {
    const res = await axios.get(`${cfg.baseUrl}/repos/${owner}/${repo}`, { headers });
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      console.warn(`Repository '${owner}/${repo}' not found`);
      throw new Error(`Repository '${owner}/${repo}' not found`);
    }
    console.error(`Error fetching repository '${owner}/${repo}':`, err.message);
    throw new Error('Failed to fetch repository details');
  }
}

async function listCommits(owner, repo) {
  const res = await axios.get(`${cfg.baseUrl}/repos/${owner}/${repo}/commits`, { headers });
  return res.data;
}
async function getReadme(owner, repo) {
  try {
    const res = await axios.get(`${cfg.baseUrl}/repos/${owner}/${repo}/readme`, {
      headers,
    });
    return res.data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.warn(`README not found for ${owner}/${repo}`);
      return null;
    }
    console.error(`Error fetching README for ${owner}/${repo}:`, err.message);
    throw err;
  }
}

async function listComments(owner, repo) {
  const res = await axios.get(`${cfg.baseUrl}/repos/${owner}/${repo}/comments`, { headers });
  return res.data;
}

module.exports = {
  listUserRepos,
  getRepoDetails,
  listCommits,
  getReadme,
  listComments
};
