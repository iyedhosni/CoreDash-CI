  // src/controllers/sonarqube.controller.js
  const service = require('../services/sonarqube.service');

  const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // Generic API fallback
  exports.callApi = wrap(async (req, res) => {
    const method   = req.params.method.toLowerCase();
    const endpoint = '/' + req.params.endpoint + (req.params[0] || '');
    const result   = await service.callApi(method, endpoint, req.query, req.body);
    res.json(result);
  });

  // ALM Integrations
  exports.getAlmIntegrations       = wrap((req, res) => service.getAlmIntegrations().then(data => res.json(data)));
  // ALM Settings
  exports.getAlmSettings           = wrap((req, res) => service.getAlmSettings().then(data => res.json(data)));

  exports.getAnalysisCacheStatus = wrap(async (req, res) => {
    const data = await service.getAnalysisCacheStatus();
    const setting = Array.isArray(data.settings)
      ? data.settings.find(s => s.key === 'sonar.analysisCache.enabled')
      : null;

    // Map "true"/"false" → ENABLED/DISABLED
    const status = setting?.value === 'true' ? 'ENABLED' : 'DISABLED';
    res.json({ status });
  });
  // Authentication
  exports.validateCredentials      = wrap((req, res) => service.validateCredentials().then(data => res.json(data)));
  // CE
  exports.getCeActivity            = wrap((req, res) => service.getCeActivity(req.query).then(data => res.json(data)));
  exports.getCeTask                = wrap((req, res) => service.getCeTask(req.params.taskId).then(data => res.json(data)));
  // Components
  exports.getComponent             = wrap((req, res) => service.getComponent(req.query).then(data => res.json(data)));
  exports.searchComponents         = wrap((req, res) => service.searchComponents(req.query).then(data => res.json(data)));
  // Duplications
  exports.getDuplications          = wrap((req, res) => service.getDuplications(req.params.componentKey).then(data => res.json(data)));
  // Favorites
  exports.getFavorites             = wrap((req, res) => service.getFavorites().then(data => res.json(data)));
  // Hotspots
  exports.searchHotspots           = wrap((req, res) => service.searchHotspots(req.query).then(data => res.json(data)));
  exports.getHotspot               = wrap((req, res) => service.getHotspot(req.params.hotspotKey).then(data => res.json(data)));
  // Issues
  exports.searchIssues             = wrap((req, res) => service.searchIssues(req.query).then(data => res.json(data)));
  // Languages
  exports.getLanguages             = wrap((req, res) => service.getLanguages().then(data => res.json(data)));
  // Measures
  exports.getComponentMeasures     = wrap((req, res) => service.getComponentMeasures(req.query).then(data => res.json(data)));
  // Metrics
  exports.searchMetrics            = wrap((req, res) => service.searchMetrics(req.query).then(data => res.json(data)));
  // Monitoring
  exports.getSystemHealth          = wrap((req, res) => service.getSystemHealth().then(data => res.json(data)));
  // New Code Periods
  exports.getNewCodePeriods        = wrap((req, res) => service.getNewCodePeriods(req.query).then(data => res.json(data)));
  // Notifications
  exports.getNotifications         = wrap((req, res) => service.getNotifications().then(data => res.json(data)));
  // Permissions
  exports.getPermissions           = wrap((req, res) => service.getPermissions(req.query).then(data => res.json(data)));
  // Plugins
  exports.getPlugins               = wrap((req, res) => service.getPlugins(req.query).then(data => res.json(data)));
  // Project Analyses
  exports.getProjectAnalyses       = wrap((req, res) => service.getProjectAnalyses(req.query).then(data => res.json(data)));
  // Project Badges
  exports.getProjectBadge          = wrap((req, res) => service.getProjectBadge(req.query).then(data => res.json(data)));
  // Project Branches
  exports.getProjectBranches       = wrap((req, res) => service.getProjectBranches(req.params.project).then(data => res.json(data)));
  // Project Dump
  exports.exportProject            = wrap((req, res) => service.exportProject(req.body.projectKey).then(data => res.json(data)));
  // Project Links
  exports.getProjectLinks          = wrap((req, res) => service.getProjectLinks(req.params.projectKey).then(data => res.json(data)));
  // Project Tags
  exports.getProjectTags           = wrap((req, res) => service.getProjectTags(req.query).then(data => res.json(data)));
  // Projects
  exports.searchProjects           = wrap((req, res) => service.searchProjects(req.query).then(data => res.json(data)));
  exports.createProject            = wrap((req, res) => service.createProject(req.body).then(data => res.json(data)));
  exports.deleteProject            = wrap((req, res) => service.deleteProject(req.params.projectKey).then(data => res.json(data)));
  // Quality Gates
  exports.getQualityGates          = wrap((req, res) => service.getQualityGates().then(data => res.json(data)));
  exports.getProjectQualityGate    = wrap((req, res) => service.getProjectQualityGate(req.params.projectKey).then(data => res.json(data)));
  // Quality Profiles
  exports.getQualityProfiles       = wrap((req, res) => service.getQualityProfiles(req.query).then(data => res.json(data)));
  // Rules
  exports.searchRules              = wrap((req, res) => service.searchRules(req.query).then(data => res.json(data)));
  // Server
  exports.getServerVersion         = wrap((req, res) => service.getServerVersion().then(data => res.json(data)));
  // Settings
  exports.getSettings              = wrap((req, res) => service.getSettings(req.query).then(data => res.json(data)));
  // Sources
  exports.getSource                = wrap((req, res) => service.getSource(req.query).then(data => res.json(data)));
  // System
  exports.getSystemStatus          = wrap((req, res) => service.getSystemStatus().then(data => res.json(data)));
  exports.getSystemInfo            = wrap((req, res) => service.getSystemInfo().then(data => res.json(data)));
  // User Groups
  exports.getUserGroups            = wrap((req, res) => service.getUserGroups(req.query).then(data => res.json(data)));
  // User Tokens
  exports.getUserTokens            = wrap((req, res) => service.getUserTokens(req.query).then(data => res.json(data)));
  // Users
  exports.searchUsers              = wrap((req, res) => service.searchUsers(req.query).then(data => res.json(data)));
  // Webhooks
  exports.getWebhooks              = wrap((req, res) => service.getWebhooks(req.query).then(data => res.json(data)));
  // Webservices
  exports.getWebservices           = wrap((req, res) => service.getWebservices().then(data => res.json(data)));
