const express = require('express');
const router = express.Router();
const githubService = require('../services/github.service');
const axios = require('axios'); // ✅ required for raw axios calls
const cfg = require('../config/github.config'); //
// GET /api/github/repos?username=your-username
const headers = {
  Authorization: `token ${cfg.token}`,
  'User-Agent': '3S-Platform'
};
router.get('/repos', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const repos = await githubService.listUserRepos(username);
    res.json(repos);
  } catch (err) {
    console.error('Error fetching repos:', err);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// GET /api/github/details?owner=username&repo=reponame
router.get('/details', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    if (!owner || !repo) return res.status(400).json({ error: 'Owner and repo are required' });

    const details = await githubService.getRepoDetails(owner, repo);
    res.json(details);
  } catch (err) {
    console.error('Error fetching repo details:', err);
    res.status(500).json({ error: 'Failed to fetch repository details' });
  }
});

// GET /api/github/commits?owner=username&repo=reponame
router.get('/commits', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    if (!owner || !repo) return res.status(400).json({ error: 'Owner and repo are required' });

    const commits = await githubService.listCommits(owner, repo);
    res.json(commits);
  } catch (err) {
    console.error('Error fetching commits:', err);
    res.status(500).json({ error: 'Failed to fetch commits' });
  }
});
router.get('/readme', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    const readme = await githubService.getReadme(owner, repo);
    res.json(readme);
  } catch (err) {
    console.error('Error fetching README:', err);
    res.status(500).json({ error: 'Failed to fetch README' });
  }
});

router.get('/comments', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    const comments = await githubService.listComments(owner, repo);
    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});
router.get('/users/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const data = await axios.get(`${cfg.baseUrl}/users/${username}`, { headers });
    res.json(data.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: `GitHub user '${username}' not found` });
    }
    console.error('Error fetching GitHub user:', err.message);
    res.status(500).json({ error: 'Failed to fetch GitHub user' });
  }
});


router.get('/users/:username/repos', async (req, res) => {
  try {
    const { username } = req.params;
    const reposRes = await axios.get(`${cfg.baseUrl}/users/${username}/repos?per_page=20&sort=updated`, { headers });
    res.json(reposRes.data);
  } catch (err) {
    console.error('Error fetching user repositories:', err);
    res.status(500).json({ error: 'Failed to fetch user repositories' });
  }
});

router.get('/users/:username/gists', async (req, res) => {
  try {
    const { username } = req.params;
    const gistsRes = await axios.get(`${cfg.baseUrl}/users/${username}/gists?per_page=10`, { headers });
    res.json(gistsRes.data);
  } catch (err) {
    console.error('Error fetching user gists:', err);
    res.status(500).json({ error: 'Failed to fetch user gists' });
  }
});

router.get('/repos/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  try {
    const data = await axios.get(`${cfg.baseUrl}/repos/${owner}/${repo}`, { headers });
    res.json(data.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: `Repository '${owner}/${repo}' not found` });
    }
    console.error('Error fetching repository:', err.message);
    res.status(500).json({ error: 'Failed to fetch repository' });
  }
});

router.get('/repos/:owner/:repo/contributors', async (req, res) => {
  const { owner, repo } = req.params;
  const data = await axios.get(`${cfg.baseUrl}/repos/${owner}/${repo}/contributors`, { headers });
  res.json(data.data);
});

router.get('/repos/:owner/:repo/languages', async (req, res) => {
  const { owner, repo } = req.params;
  const data = await axios.get(`${cfg.baseUrl}/repos/${owner}/${repo}/languages`, { headers });
  res.json(data.data);
});

router.get('/repos/:owner/:repo/commits', async (req, res) => {
  const { owner, repo } = req.params;
  const data = await axios.get(`${cfg.baseUrl}/repos/${owner}/${repo}/commits`, { headers });
  res.json(data.data);
});

router.get('/repos/:owner/:repo/contents/:path*?', async (req, res) => {
  const { owner, repo, path } = req.params;
  const data = await axios.get(`${cfg.baseUrl}/repos/${owner}/${repo}/contents/${path || ''}`, { headers });
  res.json(data.data);
});

router.get('/repos/:owner/:repo/readme', async (req, res) => {
  const { owner, repo } = req.params;
  const data = await axios.get(`${cfg.baseUrl}/repos/${owner}/${repo}/readme`, { headers });
  res.json(data.data);
});


module.exports = router;