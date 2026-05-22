const API = 'http://localhost:3000/api/jenkins';
  let autoRefreshInterval;
  let isAutoRefreshEnabled = true;

  // Theme synchronization with parent
  function syncTheme() {
    try {
      if (window.parent !== window) {
        const update = () => {
          const isDark = window.parent.document.documentElement.classList.contains('dark');
          document.documentElement.classList.toggle('dark', isDark);
        };
        update();
        const observer = new MutationObserver(update);
        observer.observe(window.parent.document.documentElement, {
          attributes: true,
          attributeFilter: ['class']
        });
      }
    } catch (e) {
      console.warn('Could not access parent theme due to CORS', e);
    }
  }

  // Format duration from milliseconds to human readable
  function formatDuration(ms) {
    if (ms == null) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Format timestamp to relative time
  function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Never built';
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) {
      const m = Math.floor(diff / 60);
      return `${m} minute${m !== 1 ? 's' : ''} ago`;
    }
    if (diff < 86400) {
      const h = Math.floor(diff / 3600);
      return `${h} hour${h !== 1 ? 's' : ''} ago`;
    }
    const d = Math.floor(diff / 86400);
    return `${d} day${d !== 1 ? 's' : ''} ago`;
  }

  // Update stats cards
  function updateStats(jobs) {
    const total = jobs.length;
    const success = jobs.filter(j => j.result === 'SUCCESS').length;
    const building = jobs.filter(j => j.building).length;
    const avg = total > 0
      ? jobs.reduce((sum, j) => sum + (j.duration || 0), 0) / total
      : 0;

    document.getElementById('total-jobs').textContent = total;
    document.getElementById('success-rate').textContent = total > 0
      ? `${Math.round((success / total) * 100)}%`
      : '0%';
    document.getElementById('building-jobs').textContent = building;
    document.getElementById('avg-duration').textContent = formatDuration(avg);
  }

  // Navigate to job details
  function goToDetails(job) {
    window.location.href = `job_details.html?job=${encodeURIComponent(job)}`;
  }

  // Helper for authenticated fetch requests
  async function authFetch(url, opts = {}) {
    const token = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...opts.headers
    };
    const response = await fetch(url, { ...opts, headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || response.statusText);
    }
    return response.json();
  }

  // Load jobs from API
  async function loadJobs() {
    const btn = document.getElementById('refresh-btn');
    btn.classList.add('loading');

    try {
      const data = await authFetch(`${API}/jobs`);
      const list = Array.isArray(data)
        ? data
        : (data.jobs || []);
      
      const detailed = await Promise.all(list.map(async job => {
        try {
          const info = await authFetch(`${API}/job/${encodeURIComponent(job.name)}`);
          const lastNum = info.lastBuild?.number;
          if (lastNum == null) {
            return { name: job.name, timestamp: null, result: null, building: false, duration: null, estimatedDuration: null };
          }
          const build = await authFetch(`${API}/job/${encodeURIComponent(job.name)}/build/${lastNum}`);
          return {
            name: job.name,
            timestamp: build.timestamp,
            result: build.result,
            building: build.building,
            duration: build.duration,
            estimatedDuration: build.estimatedDuration
          };
        } catch (e) {
          console.error(`Error loading ${job.name}`, e);
          return { name: job.name, timestamp: null, result: null, building: false, duration: null, estimatedDuration: null };
        }
      }));

      renderJobsTable(detailed);
      updateStats(detailed);
    } catch (e) {
      console.error('Jobs load failed', e);
      renderErrorState('Failed to load jobs. Please try again.');
    } finally {
      btn.classList.remove('loading');
    }
  }

  // Render jobs table
  function renderJobsTable(jobs) {
    const container = document.getElementById('jobs-container');
    if (!jobs.length) {
      container.innerHTML = `<div class="empty-state">No jobs found.</div>`;
      return;
    }

    jobs.sort((a, b) => {
      if (a.building && !b.building) return -1;
      if (!a.building && b.building) return 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    const rows = jobs.map(job => {
      const status = job.building ? 'IN_PROGRESS' : (job.result || 'NOT_BUILT');
      const statusText = status === 'NOT_BUILT' ? 'NOT BUILT' : status.replace(/_/g, ' ');
      return `
        <tr class="job-row" data-job="${job.name}">
          <td>${job.name}</td>
          <td>${formatRelativeTime(job.timestamp)}${job.timestamp ? `<div class="text-xs">${new Date(job.timestamp).toLocaleString()}</div>` : ''}</td>
          <td>${formatDuration(job.duration)}${job.building && job.estimatedDuration ? `<div class="text-xs">~${formatDuration(job.estimatedDuration)}</div>` : ''}</td>
          <td><div class="status-badge ${status}"><span class="status-dot"></span>${statusText}</div></td>
          <td onclick="event.stopPropagation()">
            <button class="build-btn" data-job="${job.name}" ${job.building ? 'disabled' : ''}>
              ${job.building ? 'Building...' : 'Build Now'}
            </button>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <table class="jobs-table">
        <thead>
          <tr><th>Name</th><th>Last Build</th><th>Duration</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    // Attach events
    container.querySelectorAll('.job-row').forEach(row => {
      row.addEventListener('click', () => goToDetails(row.dataset.job));
    });
    container.querySelectorAll('button.build-btn').forEach(btn => {
      btn.addEventListener('click', startBuild);
    });
  }

  // Render error state
  function renderErrorState(msg) {
    const container = document.getElementById('jobs-container');
    container.innerHTML = `
      <div class="empty-state">
        <h3>Error</h3>
        <p>${msg}</p>
        <button id="retry-btn">Retry</button>
      </div>`;
    document.getElementById('retry-btn').addEventListener('click', loadJobs);
  }

  // Start a build for a job
  async function startBuild(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const job = btn.dataset.job;
    btn.disabled = true;
    btn.textContent = 'Building...';

    try {
      await authFetch(`${API}/job/${encodeURIComponent(job)}/build`, { method: 'POST' });
      // Poll for completion
      const interval = setInterval(async () => {
        const info = await authFetch(`${API}/job/${encodeURIComponent(job)}`);
        if (!info.building) {
          clearInterval(interval);
          loadJobs();
        }
      }, 2000);
    } catch (err) {
      console.error('Build failed', err);
      btn.disabled = false;
      btn.textContent = 'Build Now';
      alert(`Failed to start build for ${job}: ${err.message}`);
    }
  }

  // Initialize dashboard
  function initDashboard() {
    syncTheme();
    loadJobs();
    autoRefreshInterval = setInterval(() => {
      if (isAutoRefreshEnabled) loadJobs();
    }, 5000);

    document.getElementById('refresh-btn').addEventListener('click', loadJobs);
    document.addEventListener('visibilitychange', () => {
      isAutoRefreshEnabled = !document.hidden;
    });
  }

  document.addEventListener('DOMContentLoaded', initDashboard);