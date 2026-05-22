const axios = require('axios');
require('dotenv').config();

// Transform a flat list of paths into a nested tree
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
  const baseUrl = `${process.env.NEXUS_BASE_URL}/service/rest/v1/assets`;
  const assets = [];
  let continuationToken = null;

  try {
    do {
      const res = await axios.get(baseUrl, {
        params: {
          repository,
          continuationToken
        },
        auth: {
          username: process.env.NEXUS_USER,
          password: process.env.NEXUS_PASS
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
  getRepoAssetTree
};
