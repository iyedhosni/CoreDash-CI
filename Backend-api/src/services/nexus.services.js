// src/services/nexus.services.js
const axios = require('axios');
const { baseUrl, authHeader } = require('../config/nexus.config');
const headers = { Authorization: authHeader, 'Content-Type': 'application/json' };

// Repositories API
async function listRepositories(opts = {}) {
  const resp = await axios.get(`${baseUrl}/service/rest/v1/repositories`, {
    headers,
    params: opts
  });
  return resp.data;
}

async function getRepository(name) {
  const resp = await axios.get(
    `${baseUrl}/service/rest/v1/repositories/${encodeURIComponent(name)}`,
    { headers }
  );
  return resp.data;
}

async function createRepository(cfg) {
  const resp = await axios.post(
    `${baseUrl}/service/rest/v1/repositories`,
    cfg,
    { headers }
  );
  return resp.data;
}

async function updateRepository(name, cfg) {
  const resp = await axios.put(
    `${baseUrl}/service/rest/v1/repositories/${encodeURIComponent(name)}`,
    cfg,
    { headers }
  );
  return resp.data;
}

async function deleteRepository(name) {
  await axios.delete(
    `${baseUrl}/service/rest/v1/repositories/${encodeURIComponent(name)}`,
    { headers }
  );
}

// Search & Assets APIs
async function searchComponents(params) {
  const resp = await axios.get(`${baseUrl}/service/rest/v1/search`, { headers, params });
  return resp.data;
}

async function listAssets(params) {
  const resp = await axios.get(`${baseUrl}/service/rest/v1/assets`, { headers, params });
  return resp.data;
}

// Script API
async function listScripts() {
  const resp = await axios.get(`${baseUrl}/service/rest/v1/script`, { headers });
  return resp.data;
}

async function createScript(name, content) {
  const resp = await axios.post(
    `${baseUrl}/service/rest/v1/script`,
    { name, type: 'groovy', content },
    { headers }
  );
  return resp.data;
}

async function runScript(name, args = {}) {
  const resp = await axios.post(
    `${baseUrl}/service/rest/v1/script/${encodeURIComponent(name)}/run`,
    args,
    { headers }
  );
  return resp.data;
}

async function deleteScript(name) {
  await axios.delete(
    `${baseUrl}/service/rest/v1/script/${encodeURIComponent(name)}`,
    { headers }
  );
}

// Tasks API
async function listTasks(params = {}) {
  const resp = await axios.get(`${baseUrl}/service/rest/v1/tasks`, { headers, params });
  return resp.data;
}

async function getTask(id) {
  const resp = await axios.get(`${baseUrl}/service/rest/v1/tasks/${id}`, { headers });
  return resp.data;
}

async function runTask(id) {
  const resp = await axios.post(
    `${baseUrl}/service/rest/v1/tasks/${id}/run`,
    null,
    { headers }
  );
  return resp.data;
}
// 🧠 Transform a flat list of asset paths into a nested tree
function buildTreeFromPaths(paths) {
  const root = { name: '/', type: 'folder', children: [] };

  paths.forEach(fullPath => {
    const parts = fullPath.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = name.startsWith('sha256:') || i === parts.length - 1;

      let child = current.children.find(c => c.name === name);
      if (!child) {
        child = {
          name,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : []
        };
        current.children.push(child);
      }

      if (!isFile) {
        current = child;
      }
    }
  });

  return root;
}

async function getRepoAssetTree(repository) {
  const url = `${baseUrl}/service/rest/v1/assets`;
  const assets = [];
  let continuationToken = null;

  try {
    do {
      const res = await axios.get(url, {
        params: {
          repository,
          continuationToken
        },
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Nexus response:`, res.status, res.data.items?.length || 0);

      const items = res.data.items || [];
      assets.push(...items.map(item => item.path));
      continuationToken = res.data.continuationToken;
    } while (continuationToken);

    if (assets.length === 0) {
      console.warn(`⚠️ No assets found for ${repository}`);
    }

    return buildTreeFromPaths(assets);
  } catch (err) {
    console.error('❌ Failed to fetch assets:', err.response?.data || err.message);
    throw err;
  }
}



module.exports = {
  listRepositories,
  getRepository,
  createRepository,
  updateRepository,
  deleteRepository,
  searchComponents,
  listAssets,
  listScripts,
  createScript,
  runScript,
  deleteScript,
  listTasks,
  getTask,
  runTask,
  getRepoAssetTree
};
