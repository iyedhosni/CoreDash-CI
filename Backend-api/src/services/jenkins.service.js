// src/services/jenkins.service.js

const Jenkins = require('jenkins');
const axios = require('axios');
const cfg = require('../config/jenkins.config');

const jUrl = new URL(cfg.baseUrl);
const authHeader = 'Basic ' + Buffer.from(`${jUrl.username}:${jUrl.password}`).toString('base64');
const cleanBase = `${jUrl.origin}${jUrl.pathname.replace(/\/+$/, '')}`;

// Initialize Jenkins client
const jenkins = new Jenkins({
  baseUrl:    cfg.baseUrl,
  crumbIssuer: cfg.crumbIssuer,
  promisify:   cfg.promisify,
  timeout: 100000000 // Set timeout to 10 seconds
});

// Get the workspace file tree
async function getWorkspaceTree(name) {
  const url = `${cleanBase}/job/${encodeURIComponent(name)}/ws/api/json?depth=1`;
  const resp = await axios.get(url, { headers: { Authorization: authHeader } });
  return resp.data;
}

// Get build details
async function getBuildDetails(name, buildNumber) {
  try {
    return await jenkins.build.get(name, buildNumber);
  } catch (err) {
    console.error('getBuildDetails error for', name, buildNumber, err);
    throw err;
  }
}

// Trigger a build (with or without parameters)
async function buildJob(name, params = {}) {
  try {
    if (Object.keys(params).length > 0) {
      return await jenkins.job.build(name, { parameters: params });
    } else {
      return await jenkins.job.build(name);
    }
  } catch (err) {
    console.error('buildJob error for', name, err);
    throw err;
  }
}

// Rename a Jenkins job (by copy+delete)
async function renameJob(oldName, newName) {
  try {
    const xml = await jenkins.job.config(oldName);
    await jenkins.job.create({ name: newName, xml });
    await jenkins.job.destroy(oldName);
  } catch (err) {
    console.error('renameJob error', oldName, newName, err);
    throw err;
  }
}

// Get GitHub hook log
async function getGitHubHookLog(jobName) {
  const jobInfo = await jenkins.job.get(jobName);
  const last = jobInfo.lastBuild;
  if (!last) throw { status: 404 };

  const build = await jenkins.build.get(jobName, last.number);
  const causeAction = (build.actions || []).find(a => Array.isArray(a.causes) && a.causes.length);
  if (!causeAction) throw { status: 404 };

  return causeAction.causes
    .map(c => c.shortDescription || JSON.stringify(c))
    .join('\n');
}

// Get build stages using wfapi
// Get build stages using wfapi
async function getStages(jobName) {
  const jobInfo = await jenkins.job.get(jobName);
  const last = jobInfo.lastBuild;
  if (!last || !last.number) throw { status: 404, message: 'No builds found' };

  const wfUrl = `${cleanBase}/job/${encodeURIComponent(jobName)}/${last.number}/wfapi/describe`;

  try {
    const resp = await axios.get(wfUrl, {
      headers: { Authorization: authHeader },
      validateStatus: () => true
    });

    // This is the likely culprit
    if (resp.status === 404) {
      throw { status: 404, message: 'wfapi not enabled — install Pipeline REST API plugin' };
    }

    if (resp.status !== 200) {
      throw { status: 500, message: `Unexpected status from wfapi: ${resp.status}` };
    }

    if (!resp.data.stages?.length) {
      throw { status: 404, message: 'No stages found in wfapi' };
    }

    return resp.data.stages.map(stage => ({
      name: stage.name,
      status: stage.status || 'UNKNOWN'
    }));
  } catch (err) {
    console.error('wfapi fallback failed:', err.message);
    throw err;
  }
}

// Exports
module.exports = {
  info:            () => jenkins.info(),
  listJobs:        (opts = {}) => jenkins.job.list(opts),
  getJob:          name => jenkins.job.get(name),
  createJob:       (name, xml) => jenkins.job.create({ name, xml }),
  updateJobConfig: (name, xml) => jenkins.job.config({ name, xml }),
  deleteJob:       name => jenkins.job.destroy(name),
  getJobConfig:    name => jenkins.job.config(name),
  buildJob,
  getBuildLog:     (name, num, opts = {}) => jenkins.build.log({ name, number: num, ...opts }),
  streamBuildLog:  (name, num, opts = {}) => jenkins.build.logStream({ name, number: num, ...opts }),
  listViews:       view => jenkins.view.list(view),
  createView:      (name, xml) => jenkins.view.create({ name, xml }),
  deleteView:      name => jenkins.view.destroy(name),
  getView:         name => jenkins.view.get(name),
  getBuildDetails,
  renameJob,
  getGitHubHookLog,
  getStages,
  getWorkspaceTree,
};
