// src/controllers/nexus.controller.js
const svc = require('../services/nexus.services');

// Repositories
exports.listRepositories   = async (req, res, next) => {
  try {
    const data = await svc.listRepositories(req.query);
    res.json(data);
  } catch (err) { next(err); }
};

exports.getRepository      = async (req, res, next) => {
  try {
    const data = await svc.getRepository(req.params.name);
    res.json(data);
  } catch (err) { next(err); }
};

exports.createRepository   = async (req, res, next) => {
  try {
    const data = await svc.createRepository(req.body);
    res.status(201).json(data);
  } catch (err) { next(err); }
};

exports.updateRepository   = async (req, res, next) => {
  try {
    const data = await svc.updateRepository(req.params.name, req.body);
    res.json(data);
  } catch (err) { next(err); }
};

exports.deleteRepository   = async (req, res, next) => {
  try {
    await svc.deleteRepository(req.params.name);
    res.status(204).end();
  } catch (err) { next(err); }
};

// Search & Assets
exports.searchComponents   = async (req, res, next) => {
  try {
    const data = await svc.searchComponents(req.query);
    res.json(data);
  } catch (err) { next(err); }
};

exports.listAssets         = async (req, res, next) => {
  try {
    const data = await svc.listAssets(req.query);
    res.json(data);
  } catch (err) { next(err); }
};

// Scripts
exports.listScripts        = async (_req, res, next) => {
  try {
    const data = await svc.listScripts();
    res.json(data);
  } catch (err) { next(err); }
};

exports.createScript       = async (req, res, next) => {
  try {
    const { name, content } = req.body;
    const data = await svc.createScript(name, content);
    res.status(201).json(data);
  } catch (err) { next(err); }
};

exports.runScript          = async (req, res, next) => {
  try {
    const data = await svc.runScript(req.params.name, req.body);
    res.json(data);
  } catch (err) { next(err); }
};

exports.deleteScript       = async (req, res, next) => {
  try {
    await svc.deleteScript(req.params.name);
    res.status(204).end();
  } catch (err) { next(err); }
};

// Tasks
exports.listTasks          = async (req, res, next) => {
  try {
    const data = await svc.listTasks(req.query);
    res.json(data);
  } catch (err) { next(err); }
};

exports.getTask            = async (req, res, next) => {
  try {
    const data = await svc.getTask(req.params.id);
    res.json(data);
  } catch (err) { next(err); }
};

exports.runTask            = async (req, res, next) => {
  try {
    const data = await svc.runTask(req.params.id);
    res.json(data);
  } catch (err) { next(err); }
};

// ProjectFiles


exports.getProjectFiles = async (req, res) => {
  try {
    const { projectKey } = req.params;
    const tree = await svc.getRepoAssetTree(projectKey);

    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project files' });
  }
};