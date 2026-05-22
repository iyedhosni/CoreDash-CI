// src/routes/sonarqube.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/sonarqube.controller');

router.get('/measures/component', ctrl.getComponentMeasures);
// Generic API endpoint
router.all('/api/:method/:endpoint*', ctrl.callApi);

// ALM Integrations
router.get('/alm_integrations', ctrl.getAlmIntegrations);

// ALM Settings
router.get('/alm_settings', ctrl.getAlmSettings);

// Analysis Cache
router.get('/analysis_cache/status', ctrl.getAnalysisCacheStatus);

// Authentication
router.get('/authentication/validate', ctrl.validateCredentials);

// CE (Compute Engine)
router.get('/ce/activity', ctrl.getCeActivity);
router.get('/ce/task/:taskId', ctrl.getCeTask);

// Components
router.get('/components/show', ctrl.getComponent);
router.get('/components/search', ctrl.searchComponents);

// Duplications
router.get('/duplications/show/:componentKey', ctrl.getDuplications);

// Favorites
router.get('/favorites/search', ctrl.getFavorites);

// Hotspots
router.get('/hotspots/search', ctrl.searchHotspots);
router.get('/hotspots/show/:hotspotKey', ctrl.getHotspot);

// Issues
router.get('/issues/search', ctrl.searchIssues);

// Languages
router.get('/languages/list', ctrl.getLanguages);



// Metrics
router.get('/metrics/search', ctrl.searchMetrics);

// Monitoring
router.get('/monitoring/system_health', ctrl.getSystemHealth);

// New Code Periods
router.get('/new_code_periods/list', ctrl.getNewCodePeriods);

// Notifications
router.get('/notifications/list', ctrl.getNotifications);

// Permissions
router.get('/permissions/search', ctrl.getPermissions);

// Plugins
router.get('/plugins/installed', ctrl.getPlugins);

// Project Analyses
router.get('/project_analyses/search', ctrl.getProjectAnalyses);

// Project Badges
router.get('/project_badges/measure', ctrl.getProjectBadge);

// Project Branches
router.get('/project_branches/list/:project', ctrl.getProjectBranches);

// Project Dump
router.post('/project_dump/export', ctrl.exportProject);

// Project Links
router.get('/project_links/search/:projectKey', ctrl.getProjectLinks);

// Project Tags
router.get('/project_tags/search', ctrl.getProjectTags);

// Projects
router.get('/projects/search', ctrl.searchProjects);
router.post('/projects/create', ctrl.createProject);
router.delete('/projects/delete/:projectKey', ctrl.deleteProject);

// Quality Gates
router.get('/qualitygates/list', ctrl.getQualityGates);
router.get('/qualitygates/get_by_project/:projectKey', ctrl.getProjectQualityGate);

// Quality Profiles
router.get('/qualityprofiles/search', ctrl.getQualityProfiles);

// Rules
router.get('/rules/search', ctrl.searchRules);

// Server
router.get('/server/version', ctrl.getServerVersion);

// Settings
router.get('/settings/values', ctrl.getSettings);

// Sources
router.get('/sources/show', ctrl.getSource);

// System
router.get('/system/status', ctrl.getSystemStatus);
router.get('/system/info', ctrl.getSystemInfo);

// User Groups
router.get('/user_groups/search', ctrl.getUserGroups);

// User Tokens
router.get('/user_tokens/search', ctrl.getUserTokens);

// Users
router.get('/users/search', ctrl.searchUsers);

// Webhooks
router.get('/webhooks/list', ctrl.getWebhooks);

// Webservices
router.get('/webservices/list', ctrl.getWebservices);

module.exports = router;
