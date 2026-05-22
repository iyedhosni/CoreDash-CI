// src/services/sonarqube.service.js
const axios = require('axios');
const cfg = require('../config/sonarqube.config');
const jUrl = new URL(cfg.baseUrl);
const authHeader = 'Basic ' + 
  Buffer.from(`${jUrl.username}:${jUrl.password}`).toString('base64');
const cleanBase = `${jUrl.protocol}//${jUrl.host}`;

class SonarQubeService {
  constructor() {
    this.baseUrl = `${cleanBase}/api`;
    this.defaultHeaders = {
      Authorization: authHeader,
      'Content-Type': 'application/json'
    };
  }

  async _makeRequest(method, path, params = {}, data = null) {
    const url = `${this.baseUrl}${path}`;
    try {
      const config = {
        method,
        url,
        headers: this.defaultHeaders,
        params: method === 'get' ? params : {},
        data: method !== 'get' ? data || params : null,
        paramsSerializer: (params) => {
          return Object.entries(params)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return value.map(v => `${key}=${encodeURIComponent(v)}`).join('&');
              }
              return `${key}=${encodeURIComponent(value)}`;
            })
            .join('&');
        }
      };

      const response = await axios(config);
      return response.data;
    } catch (err) {
      console.error(`SonarQube API error [${method} ${path}]:`, err.message);
      if (err.response) {
        const error = new Error(err.response.data?.message || err.message);
        error.status = err.response.status;
        error.data = err.response.data;
        throw error;
      }
      throw err;
    }
  }

  // ALM Integrations
  getAlmIntegrations() {
    return this._makeRequest('get', '/alm_integrations/list');
  }

  // ALM Settings
  getAlmSettings() {
    return this._makeRequest('get', '/alm_settings/list');
  }

  // Analysis Cache
  getAnalysisCacheStatus() {
    return this._makeRequest('get', '/settings/values', { keys: 'sonar.analysisCache.enabled' });
  }

  // Authentication
  validateCredentials() {
    return this._makeRequest('get', '/authentication/validate');
  }

  // CE (Compute Engine)
  getCeActivity(params = {}) {
    return this._makeRequest('get', '/ce/activity', params);
  }

  getCeTask(taskId) {
    return this._makeRequest('get', `/ce/task?id=${taskId}`);
  }

  // Components
  getComponent(params) {
    return this._makeRequest('get', '/components/show', params);
  }

  searchComponents(params = {}) {
    return this._makeRequest('get', '/components/search', params);
  }

  // Duplications
  getDuplications(componentKey) {
    return this._makeRequest('get', '/duplications/show', { component: componentKey });
  }

  // Favorites
  getFavorites() {
    return this._makeRequest('get', '/favorites/search');
  }

  // Hotspots
  searchHotspots(params = {}) {
    return this._makeRequest('get', '/hotspots/search', params);
  }

  getHotspot(hotspotKey) {
    return this._makeRequest('get', '/hotspots/show', { hotspotKey });
  }

  // Issues
  searchIssues(params = {}) {
    return this._makeRequest('get', '/issues/search', params);
  }

  // Languages
  getLanguages() {
    return this._makeRequest('get', '/languages/list');
  }

  // Measures
  getComponentMeasures(params) {
    return this._makeRequest('get', '/measures/component', params);
  }

  // Metrics
  searchMetrics(params = {}) {
    return this._makeRequest('get', '/metrics/search', params);
  }

  // Monitoring
  getSystemHealth() {
    return this._makeRequest('get', '/monitoring/system_health');
  }

  // New Code Periods
  getNewCodePeriods(params = {}) {
    return this._makeRequest('get', '/new_code_periods/list', params);
  }

  // Notifications
  getNotifications() {
    return this._makeRequest('get', '/notifications/list');
  }

  // Permissions
  getPermissions(params = {}) {
    return this._makeRequest('get', '/permissions/search', params);
  }

  // Plugins
  getPlugins(params = {}) {
    return this._makeRequest('get', '/plugins/installed', params);
  }

  // Project Analyses
  getProjectAnalyses(params) {
    return this._makeRequest('get', '/project_analyses/search', params);
  }

  // Project Badges
  getProjectBadge(params) {
    return this._makeRequest('get', '/project_badges/measure', params);
  }

  // Project Branches
  getProjectBranches(project) {
    return this._makeRequest('get', '/project_branches/list', { project });
  }

  // Project Dump
  exportProject(projectKey) {
    return this._makeRequest('post', '/project_dump/export', { projectKey });
  }

  // Project Links
  getProjectLinks(projectKey) {
    return this._makeRequest('get', '/project_links/search', { projectKey });
  }

  // Project Tags
  getProjectTags(params = {}) {
    return this._makeRequest('get', '/project_tags/search', params);
  }

  // Projects
  searchProjects(params = {}) {
    return this._makeRequest('get', '/projects/search', params);
  }

  createProject(params) {
    return this._makeRequest('post', '/projects/create', params);
  }

  deleteProject(project) {
    return this._makeRequest('post', '/projects/delete', { project });
  }

  // Quality Gates
  getQualityGates() {
    return this._makeRequest('get', '/qualitygates/list');
  }

  getProjectQualityGate(project) {
    return this._makeRequest('get', '/qualitygates/get_by_project', { project });
  }

  // Quality Profiles
  getQualityProfiles(params = {}) {
    return this._makeRequest('get', '/qualityprofiles/search', params);
  }

  // Rules
  searchRules(params = {}) {
    return this._makeRequest('get', '/rules/search', params);
  }

  // Server
  getServerVersion() {
    return this._makeRequest('get', '/server/version');
  }

  // Settings
  getSettings(params = {}) {
    return this._makeRequest('get', '/settings/values', params);
  }

  // Sources
  getSource(params) {
    return this._makeRequest('get', '/sources/show', params);
  }

  // System
  getSystemStatus() {
    return this._makeRequest('get', '/system/status');
  }

  getSystemInfo() {
    return this._makeRequest('get', '/system/info');
  }

  // User Groups
  getUserGroups(params = {}) {
    return this._makeRequest('get', '/user_groups/search', params);
  }

  // User Tokens
  getUserTokens(params = {}) {
    return this._makeRequest('get', '/user_tokens/search', params);
  }

  // Users
  searchUsers(params = {}) {
    return this._makeRequest('get', '/users/search', params);
  }

  // Webhooks
  getWebhooks(params = {}) {
    return this._makeRequest('get', '/webhooks/list', params);
  }

  // Webservices
  getWebservices() {
    return this._makeRequest('get', '/webservices/list');
  }

  // Generic method for any API endpoint
  async callApi(method, endpoint, params = {}, data = null) {
    return this._makeRequest(method, endpoint, params, data);
  }
}

module.exports = new SonarQubeService();