// Enhanced configuration
    const config = {
      API: 'http://localhost:3000/api/github',
      PROXY: '', // For development, remove in production
      MAX_REPOS_PER_PAGE: 30,
      DEFAULT_THEME: 'system',
      ANIMATION_DURATION: 300,
      DEBOUNCE_DELAY: 500,
      LOADING_DELAY: 1000
    };
    
    // Global state
    const state = {
      currentUser: null,
      currentRepo: null,
      currentPath: '',
      currentFile: null,
      repos: [],
      gists: [],
      profile: null,
      insights: null,
      repoPage: 1,
      hasMoreRepos: true,
      theme: localStorage.getItem('theme') || config.DEFAULT_THEME,
      loading: false,
      networkGraph: null,
      charts: {}
    };
    
    // Initialize the application
    function init() {
      syncTheme();
      initTheme();
      initEventListeners();
      initSparkles();
      showWelcomeNotification();
      
      // Check for username in URL
      const urlParams = new URLSearchParams(window.location.search);
      const username = urlParams.get('user');
      if (username) {
        document.getElementById('username').value = username;
        fetchEverything();
      }
    }
    
    function syncTheme() {
      try {
        // Check if the current window is inside an iframe
        if (window.parent !== window) {
          const updateTheme = () => {
            const isDark = window.parent.document.documentElement.classList.contains('dark');
            console.log('Parent theme detected:', isDark ? 'dark' : 'light'); // Debugging log
            document.documentElement.classList.toggle('dark', isDark);
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            state.theme = isDark ? 'dark' : 'light';
            localStorage.setItem('theme', state.theme);
          };

          // Initial sync
          updateTheme();

          // Observe changes in the parent document's class attribute
          const observer = new MutationObserver(updateTheme);
          observer.observe(window.parent.document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
          });
        } else {
          // Fallback to local storage or system preference
          const savedTheme = localStorage.getItem('theme');
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
          console.log('Fallback theme detected:', isDark ? 'dark' : 'light'); // Debugging log
          document.documentElement.classList.toggle('dark', isDark);
          document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
          state.theme = isDark ? 'dark' : 'light';
        }
      } catch (error) {
        console.warn('Could not sync theme with parent due to CORS or other issues:', error);

        // Fallback to local storage or system preference
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
        console.log('Error fallback theme detected:', isDark ? 'dark' : 'light'); // Debugging log
        document.documentElement.classList.toggle('dark', isDark);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        state.theme = isDark ? 'dark' : 'light';
      }
    }
    
    // Theme management
    function initTheme() {
      if (state.theme === 'dark' || (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
    
    function toggleTheme() {  
      if (state.theme === 'dark') {
        state.theme = 'light';
      } else if (state.theme === 'light') {
        state.theme = 'system';
      } else {
        state.theme = 'dark';
      }
      
      localStorage.setItem('theme', state.theme);
      initTheme();
      showToast('Theme changed', `Switched to ${state.theme} theme`, 'success');
    }
    
    // Event listeners
    function initEventListeners() {
      // Search on Enter key
      document.getElementById('username').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fetchEverything();
      });
      
      // Debounce search input
      let debounceTimer;
      document.getElementById('username').addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (e.target.value.trim().length > 2) {
            // Optional: Add live search functionality
          }
        }, config.DEBOUNCE_DELAY);
      });
      
      // Resize observer for responsive adjustments
      const resizeObserver = new ResizeObserver(() => {
        updateTabIndicatorPosition();
        if (state.networkGraph) {
          // Redraw network graph on resize
          setTimeout(() => renderNetworkGraph(), 100);
        }
      });
      resizeObserver.observe(document.body);
    }
    
    // UI Effects
    function initSparkles() {
      const container = document.getElementById('sparkles-container');
      const colors = ['#6e40c9', '#3aa8a8', '#ff6b6b', '#ffffff'];
      
      for (let i = 0; i < 50; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = `${Math.random() * 100}%`;
        sparkle.style.top = `${Math.random() * 100}%`;
        sparkle.style.animationDelay = `${Math.random() * 5}s`;
        sparkle.style.animationDuration = `${1 + Math.random() * 3}s`;
        sparkle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        container.appendChild(sparkle);
      }
    }
    
    function showWelcomeNotification() {
      setTimeout(() => {
        showToast('Welcome to GitHub Explorer', 'Enter a GitHub username to get started!', 'info');
      }, 1500);
    }
    
    // Tab management
    function updateTabIndicatorPosition() {
      const activeTab = document.querySelector('.tab.active');
      if (activeTab) {
        const indicator = document.querySelector('.tab-indicator');
        indicator.style.width = `${activeTab.offsetWidth}px`;
        indicator.style.left = `${activeTab.offsetLeft}px`;
      }
    }
    
    function switchTab(tabName) {
      // Update tabs
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
      
      // Update tab contents
      document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
      document.getElementById(tabName).classList.remove('hidden');
      
      // Update indicator position
      updateTabIndicatorPosition();
      
      // Load content if not already loaded
      if (tabName === 'profile' && !state.profile) {
        loadProfile(state.currentUser);
      } else if (tabName === 'gists' && state.gists.length === 0) {
        loadGists(state.currentUser);
      } else if (tabName === 'insights' && !state.insights) {
        loadInsights(state.currentUser);
      }
    }
    
function switchDetailTab(tabName) {
  // Remove active class from all tab buttons
  document.querySelectorAll('.detail-tab').forEach(tab =>
    tab.classList.remove('active')
  );
  // Add active class to the clicked tab
  document.querySelector(`.detail-tab[onclick="switchDetailTab('${tabName}')"]`).classList.add('active');

  // Hide all tab contents
  document.querySelectorAll('.detail-tab-content').forEach(content =>
    content.classList.add('hidden')
  );
  // Show selected tab
  document.getElementById(`${tabName}Tab`).classList.remove('hidden');

  // Lazy load content
  if (tabName === 'files' && document.getElementById('fileExplorerContent').innerHTML === '') {
    loadRepoContents(state.currentRepo.owner.login, state.currentRepo.name);
  } else if (tabName === 'commits' && document.getElementById('commitsContent').innerHTML === '') {
    loadRepoCommits(state.currentRepo.owner.login, state.currentRepo.name);
  } else if (tabName === 'readme' && document.getElementById('readmeContent').innerHTML === '') {
    loadRepoReadme(state.currentRepo.owner.login, state.currentRepo.name);
  } else if (tabName === 'contributors' && document.getElementById('contributorsContent').innerHTML === '') {
    loadRepoContributors(state.currentRepo.owner.login, state.currentRepo.name);
  } else if (tabName === 'analytics' && !state.charts.repoStarHistory) {
    loadRepoAnalytics(state.currentRepo.owner.login, state.currentRepo.name);
  }
}

    
    // Modal management
    function showModal(modalId) {
      const modal = document.getElementById(modalId);
      modal.classList.add('active');
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'auto';
      modal.querySelector('.modal-content').style.transform = 'scale(1)';
    }
    
    function closeModal(modalId) {
      const modal = document.getElementById(modalId || 'repoModal');
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
      modal.querySelector('.modal-content').style.transform = 'scale(0.95)';
      
      setTimeout(() => {
        modal.classList.remove('active');
      }, config.ANIMATION_DURATION);
    }
    
    
    function showAISearch() {
      showModal('aiSearchModal');
    }
    
    function closeAISearch() {
      closeModal('aiSearchModal');
    }
    
    function executeAISearch() {
      const query = document.getElementById('aiQuery').value.trim();
      if (!query) return;
      
      showLoading('AI is searching', 'Analyzing your query and finding relevant GitHub content...');
      closeAISearch();
      
      // Simulate AI search (in a real app, this would call an AI API)
      setTimeout(() => {
        hideLoading();
        showToast('AI Search Complete', 'Found 12 repositories matching your query', 'success');
        
        // Mock results
        const mockRepos = Array(12).fill().map((_, i) => ({
          name: `ai-repo-${i+1}`,
          owner: { login: 'ai-user' },
          description: `This repository matches your query about "${query}"`,
          stargazers_count: Math.floor(Math.random() * 1000),
          forks_count: Math.floor(Math.random() * 100),
          language: ['Python', 'JavaScript', 'TypeScript', 'Go'][Math.floor(Math.random() * 4)],
          updated_at: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString()
        }));
        
        renderRepos(mockRepos);
      }, 3000);
    }
    
    // Loading management
    function showLoading(title = 'Loading', message = 'Please wait...') {
      document.getElementById('loadingTitle').textContent = title;
      document.getElementById('loadingMessage').textContent = message;
      document.getElementById('loadingOverlay').style.opacity = '1';
      document.getElementById('loadingOverlay').style.pointerEvents = 'auto';
      
      // Animate progress bar
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 90) clearInterval(interval);
        document.getElementById('loadingProgress').style.width = `${progress}%`;
      }, 200);
      
      state.loading = true;
    }
    
    function hideLoading() {
      document.getElementById('loadingOverlay').style.opacity = '0';
      document.getElementById('loadingOverlay').style.pointerEvents = 'none';
      document.getElementById('loadingProgress').style.width = '0%';
      
      setTimeout(() => {
        document.getElementById('loadingOverlay').classList.remove('active');
      }, config.ANIMATION_DURATION);
      
      state.loading = false;
    }
    
    // Toast notifications
    function showToast(title, message, type = 'info') {
      const toast = document.getElementById('toast');
      const toastIcon = document.getElementById('toastIcon');
      
      // Set icon based on type
      let iconClass = 'fas fa-info-circle';
      let iconColor = 'text-blue-400';
      
      switch (type) {
        case 'success':
          iconClass = 'fas fa-check-circle';
          iconColor = 'text-green-400';
          break;
        case 'error':
          iconClass = 'fas fa-exclamation-circle';
          iconColor = 'text-red-400';
          break;
        case 'warning':
          iconClass = 'fas fa-exclamation-triangle';
          iconColor = 'text-yellow-400';
          break;
      }
      
      toastIcon.className = `${iconClass} ${iconColor}`;
      document.getElementById('toastTitle').textContent = title;
      document.getElementById('toastMessage').textContent = message;
      
      // Show toast
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
      
      // Auto-hide after 5 seconds
      setTimeout(hideToast, 5000);
    }
    
    function hideToast() {
      const toast = document.getElementById('toast');
      toast.style.transform = 'translateY(10px)';
      toast.style.opacity = '0';
    }
    
    // Data fetching
    async function fetchEverything() {
      const input = document.getElementById('username').value.trim();
      if (!input) return showToast('Error', 'Please enter a username or repository URL.', 'error');
      
      // Reset state
      state.repos = [];
      state.gists = [];
      state.profile = null;
      state.insights = null;
      state.repoPage = 1;
      state.hasMoreRepos = true;
      
      // Update URL
      window.history.pushState(null, null, `?user=${encodeURIComponent(input)}`);
      
      // Determine if input is a repository URL
      const repoMatch = input.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (repoMatch) {
        // It's a repo URL, load that repo directly
        const [, owner, repo] = repoMatch;
        showLoading('Loading repository', `Fetching ${owner}/${repo}...`);
        
        try {
          const repoData = await fetchRepo(owner, repo);
          loadRepoDetails(owner, repo);
          hideLoading();
        } catch (error) {
          hideLoading();
          showToast('Error', `Failed to load repository: ${error.message}`, 'error');
        }
        return;
      }
      
      // Otherwise treat as username
      state.currentUser = input;
      showLoading('Loading data', `Fetching GitHub information for ${input}...`);
      
      try {
        // Fetch in parallel
        const [repos, profile] = await Promise.all([
          fetchRepos(input),
          fetchProfile(input)
        ]);
        
        state.repos = repos;
        state.profile = profile;
        
        // Update UI
        renderRepos(repos);
        renderProfile(profile);
        updateQuickStats();
        
        // Show quick stats
        document.getElementById('quickStats').classList.remove('hidden');
        
        // Load additional data in background
        fetchGists(input).then(gists => {
          state.gists = gists;
          if (document.querySelector('.tab[data-tab="gists"]').classList.contains('active')) {
            renderGists(gists);
          }
        });
        
        fetchInsights(input).then(insights => {
          state.insights = insights;
          if (document.querySelector('.tab[data-tab="insights"]').classList.contains('active')) {
            renderInsights(insights);
          }
        });
        
        hideLoading();
        showToast('Success', `Loaded ${repos.length} repositories for ${input}`, 'success');
      } catch (error) {
        hideLoading();
        showToast('Error', `Failed to load data: ${error.message}`, 'error');
        console.error(error);
      }
    }
    
    // Helper to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  return token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}



// For your GitHub API fetches, add headers as needed:
async function fetchRepos(username, page = 1) {
  try {
    const response = await fetch(
      `${config.API}/users/${username}/repos?per_page=${config.MAX_REPOS_PER_PAGE}&page=${page}&sort=updated`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error(response.statusText);
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch repositories: ${error.message}`);
  }
}
    
    async function fetchProfile(username) {
      try {
        const response = await fetch(`${config.API}/users/${username}`, {
  headers: getAuthHeaders()
});
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
      } catch (error) {
        throw new Error(`Failed to fetch profile: ${error.message}`);
      }
    }
    
    async function fetchGists(username) {
      try {
        const response = await fetch(`${config.API}/users/${username}/gists`,{
  headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
      } catch (error) {
        console.error(`Failed to fetch gists: ${error.message}`);
        return [];
      }
    }
    
    async function fetchRepo(owner, repo) {
      try {
        const response = await fetch(`${config.API}/repos/${owner}/${repo}`,{
  headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
      } catch (error) {
        throw new Error(`Failed to fetch repository: ${error.message}`);
      }
    }
    
    async function fetchRepoContents(owner, repo, path = '') {
      try {
        const response = await fetch(`${config.API}/repos/${owner}/${repo}/contents/${path}`,
          {headers: getAuthHeaders()}
        );
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
      } catch (error) {
        throw new Error(`Failed to fetch repository contents: ${error.message}`);
      }
    }
    
    async function fetchRepoCommits(owner, repo) {
      try {
        const response = await fetch(`${config.API}/repos/${owner}/${repo}/commits?per_page=10`,{
  headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
      } catch (error) {
        throw new Error(`Failed to fetch commits: ${error.message}`);
      }
    }
    
    async function fetchRepoReadme(owner, repo) {
      const readmeContent = document.getElementById('readmeContent');
      readmeContent.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-[var(--primary)]"></i> Loading README...</div>';
      
      try {
        const readme = await fetchRepoReadme(owner, repo);
        if (!readme) {
          readmeContent.innerHTML = `
            <div class="text-center py-4 text-gray-500">
              <i class="fas fa-book"></i> No README found for this repository.
            </div>
          `;
          return;
        }

        const response = await fetch(readme.download_url);
        if (!response.ok) throw new Error(response.statusText);
        const markdown = await response.text();

        readmeContent.innerHTML = `
          <div class="prose dark:prose-invert max-w-none">
            ${marked.parse(markdown)}
          </div>
        `;
      } catch (error) {
        readmeContent.innerHTML = `
          <div class="text-center py-4 text-red-500">
            <i class="fas fa-exclamation-circle"></i> Failed to load README: ${error.message}
          </div>
        `;
      }
    }
    
    async function fetchRepoContributors(owner, repo) {
      try {
        const response = await fetch(`${config.API}/repos/${owner}/${repo}/contributors`,{
          headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
      } catch (error) {
        throw new Error(`Failed to fetch contributors: ${error.message}`);
      }
    }
    
    async function fetchRepoLanguages(owner, repo) {
      try {
        const response = await fetch(`${config.API}/repos/${owner}/${repo}/languages`,{
          headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
      } catch (error) {
        throw new Error(`Failed to fetch languages: ${error.message}`);
      }
    }
    
    async function fetchInsights(username) {
      // This would be enhanced with more complex analytics in a real app
      return {
        languages: {},
        network: [],
        starHistory: [],
        commitActivity: []
      };
    }
    
    // Data rendering
    function renderRepos(repos) {
      const container = document.getElementById('reposContainer');
      
      if (repos.length === 0) {
        container.innerHTML = `
          <div class="col-span-full text-center py-12">
            <div class="empty-state-icon text-6xl text-gray-400 mb-4">
              <i class="fas fa-folder-open"></i>
            </div>
            <div class="empty-state-title text-xl font-semibold mb-2">
              No Repositories Found
            </div>
            <div class="empty-state-description text-gray-500 dark:text-gray-400">
              This user doesn't have any public repositories or we couldn't load them.
            </div>
          </div>
        `;
        return;
      }
      
      // Clear only if it's the first page
      if (state.repoPage === 1) {
        container.innerHTML = '';
      }
      
      repos.forEach(repo => {
        const card = document.createElement('div');
        card.className = 'repo-card bg-white/80 dark:bg-gray-800/90 rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg';
        card.innerHTML = `
          <div class="p-6">
            <div class="flex justify-between items-start mb-2">
              <h3 class="text-lg font-bold truncate" title="${repo.name}">
                <a href="#" onclick="loadRepoDetails('${repo.owner.login}', '${repo.name}'); return false;" class="hover:underline">
                  ${repo.name}
                </a>
              </h3>
              <span class="text-xs px-2 py-1 rounded-full ${repo.private ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'}">
                ${repo.private ? 'Private' : 'Public'}
              </span>
            </div>
            
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2" title="${repo.description || 'No description'}">
              ${repo.description || 'No description provided'}
            </p>
            
            <div class="flex items-center justify-between text-sm mb-4">
              <span class="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <i class="fas fa-code"></i>
                ${repo.language || 'Unknown'}
              </span>
              <span class="text-gray-500 dark:text-gray-400" title="Updated ${new Date(repo.updated_at).toLocaleString()}">
                ${formatRelativeTime(repo.updated_at)}
              </span>
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1 text-gray-600 dark:text-gray-300" title="${repo.stargazers_count} stars">
                  <i class="fas fa-star text-yellow-400"></i>
                  ${abbreviateNumber(repo.stargazers_count)}
                </span>
                <span class="flex items-center gap-1 text-gray-600 dark:text-gray-300" title="${repo.forks_count} forks">
                  <i class="fas fa-code-branch text-blue-400"></i>
                  ${abbreviateNumber(repo.forks_count)}
                </span>
              </div>
              
              <div class="flex items-center gap-2">
                <a href="${repo.html_url}" target="_blank" class="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="View on GitHub">
                  <i class="fas fa-external-link-alt text-sm"></i>
                </a>
                <button onclick="loadRepoDetails('${repo.owner.login}', '${repo.name}')" class="p-2 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white transition-colors" title="View details">
                  <i class="fas fa-chevron-right text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
      
      // Show/hide load more button
      const loadMoreBtn = document.getElementById('loadMoreBtn');
      if (repos.length === config.MAX_REPOS_PER_PAGE) {
        loadMoreBtn.classList.remove('hidden');
      } else {
        loadMoreBtn.classList.add('hidden');
      }
    }
    
    function renderProfile(profile) {
      const container = document.getElementById('profileContent');
      
      container.innerHTML = `
        <div class="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div class="flex-shrink-0">
            <img src="${profile.avatar_url}" alt="${profile.login}" class="w-40 h-40 rounded-full ring-4 ring-[var(--primary)] p-1">
            <div class="mt-4 text-center">
              <h2 class="text-2xl font-bold">${profile.name || profile.login}</h2>
              <p class="text-gray-600 dark:text-gray-400">@${profile.login}</p>
              ${profile.bio ? `<p class="mt-2 text-gray-700 dark:text-gray-300">${profile.bio}</p>` : ''}
            </div>
            
            <div class="mt-4 flex justify-center gap-4">
              ${profile.twitter_username ? `
                <a href="https://twitter.com/${profile.twitter_username}" target="_blank" class="text-blue-400 hover:text-blue-500">
                  <i class="fab fa-twitter text-xl"></i>
                </a>
              ` : ''}
              ${profile.blog ? `
                <a href="${profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`}" target="_blank" class="text-purple-400 hover:text-purple-500">
                  <i class="fas fa-globe text-xl"></i>
                </a>
              ` : ''}
              <a href="${profile.html_url}" target="_blank" class="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                <i class="fab fa-github text-xl"></i>
              </a>
            </div>
          </div>
          
          <div class="flex-1 w-full">
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div class="stat-card bg-white/80 dark:bg-gray-700/50 p-4 rounded-xl shadow-sm">
                <div class="stat-title text-sm text-gray-500 dark:text-gray-400">Followers</div>
                <div class="stat-value text-2xl font-bold">${abbreviateNumber(profile.followers)}</div>
              </div>
              <div class="stat-card bg-white/80 dark:bg-gray-700/50 p-4 rounded-xl shadow-sm">
                <div class="stat-title text-sm text-gray-500 dark:text-gray-400">Following</div>
                <div class="stat-value text-2xl font-bold">${abbreviateNumber(profile.following)}</div>
              </div>
              <div class="stat-card bg-white/80 dark:bg-gray-700/50 p-4 rounded-xl shadow-sm">
                <div class="stat-title text-sm text-gray-500 dark:text-gray-400">Public Repos</div>
                <div class="stat-value text-2xl font-bold">${abbreviateNumber(profile.public_repos)}</div>
              </div>
              <div class="stat-card bg-white/80 dark:bg-gray-700/50 p-4 rounded-xl shadow-sm">
                <div class="stat-title text-sm text-gray-500 dark:text-gray-400">Public Gists</div>
                <div class="stat-value text-2xl font-bold">${abbreviateNumber(profile.public_gists)}</div>
              </div>
              <div class="stat-card bg-white/80 dark:bg-gray-700/50 p-4 rounded-xl shadow-sm">
                <div class="stat-title text-sm text-gray-500 dark:text-gray-400">Created</div>
                <div class="stat-value text-lg">${formatDate(profile.created_at)}</div>
              </div>
              <div class="stat-card bg-white/80 dark:bg-gray-700/50 p-4 rounded-xl shadow-sm">
                <div class="stat-title text-sm text-gray-500 dark:text-gray-400">Last Active</div>
                <div class="stat-value text-lg">${formatDate(profile.updated_at)}</div>
              </div>
            </div>
            
            ${profile.company || profile.location ? `
              <div class="bg-white/80 dark:bg-gray-700/50 p-4 rounded-xl shadow-sm mb-4">
                <h3 class="font-semibold mb-2 flex items-center gap-2">
                  <i class="fas fa-info-circle text-[var(--primary)]"></i> Details
                </h3>
                <div class="space-y-2">
                  ${profile.company ? `
                    <div class="flex items-center gap-2">
                      <i class="fas fa-building text-gray-500 dark:text-gray-400"></i>
                      <span>${profile.company}</span>
                    </div>
                  ` : ''}
                  ${profile.location ? `
                    <div class="flex items-center gap-2">
                      <i class="fas fa-map-marker-alt text-gray-500 dark:text-gray-400"></i>
                      <span>${profile.location}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
    
    function renderGists(gists) {
      const container = document.getElementById('gistsContent');
      
      if (gists.length === 0) {
        container.innerHTML = `
          <div class="text-center py-12">
            <div class="empty-state-icon text-6xl text-gray-400 mb-4">
              <i class="fas fa-file-code"></i>
            </div>
            <div class="empty-state-title text-xl font-semibold mb-2">
              No Gists Found
            </div>
            <div class="empty-state-description text-gray-500 dark:text-gray-400">
              This user doesn't have any public gists or we couldn't load them.
            </div>
          </div>
        `;
        return;
      }
      
      container.innerHTML = '';
      
      gists.forEach(gist => {
        const gistCard = document.createElement('div');
        gistCard.className = 'gist-card bg-white/80 dark:bg-gray-700/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300';
        
        const files = Object.keys(gist.files).map(filename => {
          const file = gist.files[filename];
          return `<span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">${file.language || 'Text'}</span>`;
        }).join(' ');
        
        const description = gist.description ? gist.description : 'No description';
        
        gistCard.innerHTML = `
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-medium truncate" title="${description}">${description}</h3>
            <span class="text-xs text-gray-500 dark:text-gray-400">${formatRelativeTime(gist.updated_at)}</span>
          </div>
          <div class="flex flex-wrap gap-2 mb-3">${files}</div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <i class="fas fa-comment"></i>
              ${gist.comments}
              <i class="fas fa-code-branch ml-2"></i>
              ${Object.keys(gist.files).length}
            </div>
            <a href="${gist.html_url}" target="_blank" class="text-sm px-3 py-1 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white transition-colors">
              View
            </a>
          </div>
        `;
        
        container.appendChild(gistCard);
      });
    }
    
    function renderInsights(insights) {
      // Language chart
      renderLanguageChart(insights.languages);
      
      // Network graph
      renderNetworkGraph(insights.network);
      
      // Star history chart
      renderStarHistoryChart(insights.starHistory);
      
      // Commit activity chart
      renderCommitActivityChart(insights.commitActivity);
    }
    
    function renderLanguageChart(languages) {
  const container = document.getElementById('languageChart');
  container.innerHTML = ''; // Clear previous chart
  
  if (!languages || Object.keys(languages).length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-500">No language data available</div>';
    return;
  }
  
  // Prepare data for chart
  const labels = Object.keys(languages);
  const data = Object.values(languages);
  const total = data.reduce((sum, value) => sum + value, 0);
  const backgroundColors = generateColorPalette(labels.length);
  
  // Create canvas element
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  
  // Destroy previous chart if exists
  if (state.charts.language) {
    state.charts.language.destroy();
  }
  
  // Create new chart
  const ctx = canvas.getContext('2d');
  state.charts.language = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333',
            font: {
              family: 'inherit'
            },
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle',
            generateLabels: function(chart) {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label, i) => {
                  const value = data.datasets[0].data[i];
                  const percentage = ((value / total) * 100).toFixed(1);
                  return {
                    text: `${label}: ${percentage}% (${value.toLocaleString()})`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${percentage}% (${value.toLocaleString()} bytes)`;
            }
          }
        }
      },
      cutout: '70%',
      animation: {
        animateScale: true,
        animateRotate: true
      }
    }
  });
}

function renderNetworkGraph(networkData) {
  const container = document.getElementById('networkGraph');
  container.innerHTML = ''; // Clear previous graph
  
  if (!networkData || networkData.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-500">No network data available</div>';
    return;
  }
  
  // Create Three.js scene
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // Destroy previous scene if exists
  if (state.networkGraph) {
    state.networkGraph.sceneDispose();
  }
  
  // Create new scene
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);
  
  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
  
  // Create nodes and edges
  const nodes = [];
  const edges = [];
  
  // Sample data processing (in a real app, this would use actual network data)
  const centerNode = {
    id: 'center',
    name: state.currentUser,
    x: 0,
    y: 0,
    z: 0,
    size: 10,
    color: 0x6e40c9
  };
  nodes.push(centerNode);
  
  // Add some random nodes for demo purposes
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2;
    const radius = 5 + Math.random() * 10;
    const node = {
      id: `node-${i}`,
      name: `Repo ${i + 1}`,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: (Math.random() - 0.5) * 5,
      size: 3 + Math.random() * 5,
      color: Math.random() * 0xffffff
    };
    nodes.push(node);
    edges.push({
      source: 'center',
      target: `node-${i}`,
      value: Math.random() * 3
    });
  }
  
  // Create spheres for nodes
  nodes.forEach(node => {
    const geometry = new THREE.SphereGeometry(node.size / 10, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: node.color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(node.x, node.y, node.z);
    sphere.userData = { node };
    scene.add(sphere);
    
    // Add label (simplified for demo)
    const label = document.createElement('div');
    label.className = 'network-label';
    label.textContent = node.name;
    label.style.position = 'absolute';
    label.style.color = '#fff';
    label.style.pointerEvents = 'none';
    label.style.transform = 'translate(-50%, -50%)';
    label.style.display = 'none';
    container.appendChild(label);
    sphere.userData.label = label;
  });
  
  // Create lines for edges
  edges.forEach(edge => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    
    if (source && target) {
      const material = new THREE.LineBasicMaterial({ 
        color: 0x888888,
        transparent: true,
        opacity: 0.5
      });
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(source.x, source.y, source.z),
        new THREE.Vector3(target.x, target.y, target.z)
      ]);
      const line = new THREE.Line(geometry, material);
      scene.add(line);
    }
  });
  
  // Add controls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  
  // Position camera
  camera.position.z = 20;
  
  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Update labels
    nodes.forEach(node => {
      if (node.mesh && node.mesh.userData.label) {
        const label = node.mesh.userData.label;
        const vector = new THREE.Vector3(node.x, node.y, node.z);
        vector.project(camera);
        
        const x = (vector.x * 0.5 + 0.5) * container.clientWidth;
        const y = (-(vector.y * 0.5) + 0.5) * container.clientHeight;
        
        label.style.left = `${x}px`;
        label.style.top = `${y}px`;
        
        // Simple visibility check
        const distance = vector.z;
        label.style.display = distance < 1 ? 'block' : 'none';
      }
    });
    
    renderer.render(scene, camera);
  }
  
  animate();
  
  // Handle resize
  function handleResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  
  window.addEventListener('resize', handleResize);
  
  // Store cleanup function
  state.networkGraph = {
    sceneDispose: () => {
      window.removeEventListener('resize', handleResize);
      container.innerHTML = '';
    }
  };
}

function renderStarHistoryChart(starHistory) {
  const ctx = document.getElementById('starHistoryChart').getContext('2d');
  
  // Destroy previous chart if exists
  if (state.charts.starHistory) {
    state.charts.starHistory.destroy();
  }
  
  // Sample data for demo
  const labels = Array(12).fill().map((_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (12 - i - 1));
    return date.toLocaleString('default', { month: 'short' });
  });
  
  const data = Array(12).fill(0).map((_, i) => {
    return i === 0 ? 0 : Math.round(data[i-1] + Math.random() * 50);
  });
  
  state.charts.starHistory = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Stars',
        data: data,
        borderColor: 'rgba(110, 64, 201, 1)',
        backgroundColor: 'rgba(110, 64, 201, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(110, 64, 201, 1)',
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333'
          }
        },
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333'
          }
        }
      }
    },
  });
}

function renderCommitActivityChart(commitActivity) {
  const ctx = document.getElementById('commitActivityChart').getContext('2d');
  
  // Destroy previous chart if exists
  if (state.charts.commitActivity) {
    state.charts.commitActivity.destroy();
  }
  
  // Sample data for demo
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeks = 4;
  const datasets = [];
  
  for (let i = 0; i < weeks; i++) {
    datasets.push({
      label: `${weeks - i} weeks ago`,
      data: labels.map(() => Math.floor(Math.random() * 10)),
      backgroundColor: `rgba(58, 168, 168, ${0.2 + (i * 0.2)})`,
      borderColor: `rgba(58, 168, 168, ${0.8 - (i * 0.2)})`,
      borderWidth: 1
    });
  }
  
  state.charts.commitActivity = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333'
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          stacked: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333'
          }
        },
        x: {
          stacked: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333'
          }
        }
      }
    }
  });
}

function renderRepoDetails(repo) {
  state.currentRepo = repo;
  
  // Set modal title
  document.getElementById('modalRepoTitle').textContent = `${repo.owner.login}/${repo.name}`;
  document.getElementById('repoViewOnGitHub').href = repo.html_url;
  
  // Render repo info
  const repoInfoContent = document.getElementById('repoInfoContent');
  repoInfoContent.innerHTML = `
    <div class="grid grid-cols-2 gap-4">
      <div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Owner</div>
        <div class="font-medium">${repo.owner.login}</div>
      </div>
      <div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Created</div>
        <div class="font-medium">${formatDate(repo.created_at)}</div>
      </div>
      <div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Last Updated</div>
        <div class="font-medium">${formatDate(repo.updated_at)}</div>
      </div>
      <div>
        <div class="text-sm text-gray-500 dark:text-gray-400">License</div>
        <div class="font-medium">${repo.license?.name || 'None'}</div>
      </div>
      <div class="col-span-2">
        <div class="text-sm text-gray-500 dark:text-gray-400">Description</div>
        <div class="font-medium">${repo.description || 'No description provided'}</div>
      </div>
      <div class="col-span-2">
        <div class="text-sm text-gray-500 dark:text-gray-400">Homepage</div>
        <div class="font-medium">
          ${repo.homepage ? `<a href="${repo.homepage}" target="_blank" class="text-[var(--primary)] hover:underline">${repo.homepage}</a>` : 'None'}
        </div>
      </div>
    </div>
  `;
  
  // Render repo stats
  const repoStatsContent = document.getElementById('repoStatsContent');
  repoStatsContent.innerHTML = `
    <div class="grid grid-cols-2 gap-4">
      <div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Stars</div>
        <div class="font-medium">${abbreviateNumber(repo.stargazers_count)}</div>
      </div>
      <div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Forks</div>
        <div class="font-medium">${abbreviateNumber(repo.forks_count)}</div>
      </div>
      <div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Watchers</div>
        <div class="font-medium">${abbreviateNumber(repo.watchers_count)}</div>
      </div>
      <div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Open Issues</div>
        <div class="font-medium">${abbreviateNumber(repo.open_issues_count)}</div>
      </div>
      <div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Size</div>
        <div class="font-medium">${formatBytes(repo.size * 1024)}</div>
      </div>
      <div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Default Branch</div>
        <div class="font-medium">${repo.default_branch}</div>
      </div>
    </div>
  `;
  
  // Show modal
  showModal('repoModal');
  
  // Load additional data
  loadRepoLanguages(repo.owner.login, repo.name);
  loadRepoContents(repo.owner.login, repo.name);
}

async function loadRepoDetails(owner, repo) {
  showLoading('Loading repository', `Fetching details for ${owner}/${repo}...`);
  
  try {
    const repoData = await fetchRepo(owner, repo);
    renderRepoDetails(repoData);
    hideLoading();
  } catch (error) {
    hideLoading();
    showToast('Error', `Failed to load repository: ${error.message}`, 'error');
  }
}

async function loadRepoLanguages(owner, repo) {
  try {
    const languages = await fetchRepoLanguages(owner, repo);
    updateRepoAnalysis(languages);
  } catch (error) {
    console.error('Failed to load languages:', error);
  }
}

function updateRepoAnalysis(languages) {
  const analysisContent = document.getElementById('repoAnalysisContent');
  
  if (!languages || Object.keys(languages).length === 0) {
    analysisContent.innerHTML = '<div class="col-span-full text-center py-4 text-gray-500">No language data available</div>';
    return;
  }
  
  // Calculate metrics (mock data for demo)
  const codeQuality = Math.min(100, Math.floor(Math.random() * 40) + 60);
  const documentation = Math.min(100, Math.floor(Math.random() * 30) + 40);
  const testCoverage = Math.min(100, Math.floor(Math.random() * 50) + 30);
  const maintainability = Math.min(100, Math.floor(Math.random() * 60) + 30);
  
  // Update radial progress bars
  document.querySelectorAll('.radial-progress').forEach(el => {
    const type = el.parentElement.querySelector('div:last-child').textContent.toLowerCase();
    let value = 0;
    
    switch (type) {
      case 'code quality': value = codeQuality; break;
      case 'documentation': value = documentation; break;
      case 'test coverage': value = testCoverage; break;
      case 'maintainability': value = maintainability; break;
    }
    
    el.style.setProperty('--value', value);
    el.textContent = `${value}%`;
  });
}

async function loadRepoContents(owner, repo, path = '') {
  const fileExplorerContent = document.getElementById('fileExplorerContent');
  const breadcrumb = document.getElementById('breadcrumb');
  
  showLoading('Loading contents', `Fetching files for ${owner}/${repo}...`);
  
  try {
    const contents = await fetchRepoContents(owner, repo, path);
    
    // Update breadcrumb
    const pathParts = path.split('/').filter(p => p);
    breadcrumb.innerHTML = `
      <a href="#" onclick="loadRepoContents('${owner}', '${repo}', ''); return false;" class="text-[var(--primary)] hover:underline">root</a>
      ${pathParts.map((part, i) => {
        const currentPath = pathParts.slice(0, i + 1).join('/');
        return `
          <span class="text-gray-500 dark:text-gray-400">/</span>
          <a href="#" onclick="loadRepoContents('${owner}', '${repo}', '${currentPath}'); return false;" class="text-[var(--primary)] hover:underline">${part}</a>
        `;
      }).join('')}
    `;
    
    // Render contents
fileExplorerContent.innerHTML = `
  <ul class="file-tree space-y-2">
    ${contents.map(item => {
      if (item.type === 'dir') {
        return `
          <li class="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg cursor-pointer" 
              onclick="loadRepoContents('${owner}', '${repo}', '${path ? `${path}/` : ''}${item.name}')">
            <i class="fas fa-folder text-yellow-400"></i>📁
            <span>${item.name}</span>
          </li>
        `;
      } else {
        const iconClass = getFileIcon(item.name);
        return `
          <li class="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg cursor-pointer" 
              onclick="loadFileContent('${owner}', '${repo}', '${path ? `${path}/` : ''}${item.name}', '${item.download_url}')">
            ${iconClass}
            <span>${item.name}</span>
          </li>
        `;
      }
    }).join('')}
  </ul>
`;




    
    hideLoading();
  } catch (error) {
    hideLoading();
    showToast('Error', `Failed to load repository contents: ${error.message}`, 'error');
  }
}
function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();

  switch (ext) {
    case 'js':
    case 'ts':
      return '<i class="fab fa-js text-yellow-500"></i> 📜';
    case 'html':
      return '<i class=fab fa-html5 text-orange-500"></i>🌐';
    case 'css':
      return '<i class=fab fa-css3-alt text-blue-500"></i>🎨';
    case 'md':
      return '<i class=fas fa-book text-purple-500"></i>📘';
    case 'json':
      return '<i class=fas fa-database text-emerald-500"></i>🗂️';
    case 'yml':
    case 'yaml':
      return '<i class=fas fa-cogs text-indigo-400"></i>⚙️';
    case 'py':
      return '<i class=fab fa-python text-blue-400"></i>🐍';
    case 'java':
      return '<i class=fab fa-java text-red-400"></i>☕';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return '<i class=fas fa-image text-pink-500"></i>🖼️';
    case 'zip':
    case 'rar':
    case 'gz':
      return '<i class=fas fa-file-archive text-orange-400"></i>🗜️';
    case 'pdf':
      return '<i class=fas fa-file-pdf text-red-500 "></i>📄';
    case 'txt':
      return '<i class=fas fa-file-alt text-gray-400 "></i>📝';
    default:
      return '<i fas fa-file-code text-gray-400"></i>';
  }
}


async function loadFileContent(owner, repo, path, downloadUrl) {
  showLoading('Loading file', `Fetching ${path}...`);
  
  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(response.statusText);
    const content = await response.text();
    
    // Set modal title
    document.getElementById('modalFileTitle').textContent = path.split('/').pop();
    
    // Set file info
    document.getElementById('fileInfo').textContent = `${path} • ${formatBytes(content.length)}`;
    
    // Highlight and display content
    const fileContent = document.getElementById('fileContent');
    fileContent.textContent = content;
    hljs.highlightElement(fileContent);
    
    // Show modal
    showModal('fileModal');
    hideLoading();
  } catch (error) {
    hideLoading();
    showToast('Error', `Failed to load file: ${error.message}`, 'error');
  }
}

async function loadRepoCommits(owner, repo) {
  const commitsContent = document.getElementById('commitsContent');
  commitsContent.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-[var(--primary)]"></i> Loading commits...</div>';
  
  try {
    const commits = await fetchRepoCommits(owner, repo);
    
    if (commits.length === 0) {
      commitsContent.innerHTML = '<div class="text-center py-4 text-gray-500">No commits found</div>';
      return;
    }
    
    commitsContent.innerHTML = commits.map(commit => `
      <div class="commit-item bg-white/80 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm">
        <div class="flex items-start gap-3">
          <img src="${commit.author?.avatar_url || 'https://via.placeholder.com/40'}" alt="${commit.commit.author.name}" class="w-10 h-10 rounded-full">
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <div class="font-medium">${commit.commit.author.name}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">${formatRelativeTime(commit.commit.author.date)}</div>
            </div>
            <div class="text-sm mb-2">${commit.commit.message.split('\n')[0]}</div>
            <div class="flex items-center gap-2 text-xs">
              <a href="${commit.html_url}" target="_blank" class="text-[var(--primary)] hover:underline">
                <i class="fas fa-code-commit"></i> ${commit.sha.substring(0, 7)}
              </a>
              ${commit.stats ? `
                <span class="text-green-500"><i class="fas fa-plus"></i> ${commit.stats.additions}</span>
                <span class="text-red-500"><i class="fas fa-minus"></i> ${commit.stats.deletions}</span>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    commitsContent.innerHTML = `
      <div class="text-center py-4 text-red-500">
        <i class="fas fa-exclamation-circle"></i> Failed to load commits: ${error.message}
      </div>
    `;
  }
}

async function loadRepoReadme(owner, repo) {
  const readmeContent = document.getElementById('readmeContent');
  readmeContent.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-[var(--primary)]"></i> Loading README...</div>';
  
  try {
    const readme = await fetchRepoReadme(owner, repo);
    if (!readme) {
      readmeContent.innerHTML = `
        <div class="text-center py-4 text-gray-500">
          <i class="fas fa-book"></i> No README found for this repository.
        </div>
      `;
      return;
    }

    const response = await fetch(readme.download_url);
    if (!response.ok) throw new Error(response.statusText);
    const markdown = await response.text();

    readmeContent.innerHTML = `
      <div class="prose dark:prose-invert max-w-none">
        ${marked.parse(markdown)}
      </div>
    `;
  } catch (error) {
    readmeContent.innerHTML = `
      <div class="text-center py-4 text-red-500">
        <i class="fas fa-exclamation-circle"></i> Failed to load README: ${error.message}
      </div>
    `;
  }
}

async function loadRepoContributors(owner, repo) {
  const contributorsContent = document.getElementById('contributorsContent');
  contributorsContent.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-[var(--primary)]"></i> Loading contributors...</div>';
  
  try {
    const contributors = await fetchRepoContributors(owner, repo);
    
    if (contributors.length === 0) {
      contributorsContent.innerHTML = '<div class="text-center py-4 text-gray-500">No contributors found</div>';
      return;
    }
    
    contributorsContent.innerHTML = contributors.map(contributor => `
      <div class="contributor-item flex flex-col items-center text-center">
        <a href="${contributor.html_url}" target="_blank" class="contributor-avatar relative transition-transform duration-300">
          <img src="${contributor.avatar_url}" alt="${contributor.login}" class="w-16 h-16 rounded-full">
          <div class="absolute -inset-1 bg-[var(--primary)] rounded-full opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
        </a>
        <div class="mt-2">
          <a href="${contributor.html_url}" target="_blank" class="font-medium hover:underline">${contributor.login}</a>
          <div class="text-xs text-gray-500 dark:text-gray-400">${contributor.contributions} commits</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    contributorsContent.innerHTML = `
      <div class="text-center py-4 text-red-500">
        <i class="fas fa-exclamation-circle"></i> Failed to load contributors: ${error.message}
      </div>
    `;
  }
}

async function loadRepoAnalytics(owner, repo) {
    ['repoStarHistory', 'repoCommitActivity', 'repoCodeFrequency', 'repoPunchCard'].forEach(key => {
    if (state.charts[key]) {
      state.charts[key].destroy();
      state.charts[key] = null;
    }
  });
  const container = document.getElementById('analyticsContent');
  container.innerHTML = `
    <div class="repo-detail-section bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl">
      <h3 class="repo-detail-section-title text-lg font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-star text-yellow-400"></i> Star History
      </h3>
      <canvas id="repoStarHistoryChart" class="w-full h-[300px]"></canvas>
    </div>
    <div class="repo-detail-section bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl">
      <h3 class="repo-detail-section-title text-lg font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-code-branch text-[var(--accent)]"></i> Commit Activity
      </h3>
      <canvas id="repoCommitActivityChart" class="w-full h-[300px]"></canvas>
    </div>
    <div class="repo-detail-section bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl">
      <h3 class="repo-detail-section-title text-lg font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-project-diagram text-[var(--secondary)]"></i> Code Frequency
      </h3>
      <canvas id="repoCodeFrequencyChart" class="w-full h-[300px]"></canvas>
    </div>
    <div class="repo-detail-section bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl">
      <h3 class="repo-detail-section-title text-lg font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-clock text-purple-500"></i> Punch Card
      </h3>
      <canvas id="repoPunchCardChart" class="w-full h-[300px]"></canvas>
    </div>
  `;
   document.getElementById('repoStarHistoryChart').outerHTML = `<canvas id="repoStarHistoryChart"></canvas>`;
  document.getElementById('repoCommitActivityChart').outerHTML = `<canvas id="repoCommitActivityChart"></canvas>`;
  document.getElementById('repoCodeFrequencyChart').outerHTML = `<canvas id="repoCodeFrequencyChart"></canvas>`;
  document.getElementById('repoPunchCardChart').outerHTML = `<canvas id="repoPunchCardChart"></canvas>`;

  // Star history chart
  const starHistoryCtx = document.getElementById('repoStarHistoryChart').getContext('2d');
  
  // Commit activity chart
  const commitActivityCtx = document.getElementById('repoCommitActivityChart').getContext('2d');
  
  // Code frequency chart
  const codeFrequencyCtx = document.getElementById('repoCodeFrequencyChart').getContext('2d');
  
  // Punch card chart
  const punchCardCtx = document.getElementById('repoPunchCardChart').getContext('2d');
  
  // Sample data for demo
  const starHistoryData = Array(12).fill(0).map((_, i) => {
    return i === 0 ? 0 : Math.round(Math.random() * 100 + (i * 50));

  });
  
  const commitActivityData = Array(7).fill().map(() => Math.floor(Math.random() * 10));
  
  // Create charts
  state.charts.repoStarHistory = new Chart(starHistoryCtx, {
    type: 'line',
    data: {
      labels: Array(12).fill().map((_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (12 - i - 1));
        return date.toLocaleString('default', { month: 'short' });
      }),
      datasets: [{
        label: 'Stars',
        data: starHistoryData,
        borderColor: 'rgba(255, 107, 107, 1)',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    },
    options: getChartOptions('Stars over time')
  });
  
  state.charts.repoCommitActivity = new Chart(commitActivityCtx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Commits',
        data: commitActivityData,
        backgroundColor: 'rgba(58, 168, 168, 0.7)'
      }]
    },
    options: getChartOptions('Weekly commit activity')
  });
  
  state.charts.repoCodeFrequency = new Chart(codeFrequencyCtx, {
    type: 'line',
    data: {
      labels: Array(12).fill().map((_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (12 - i - 1));
        return date.toLocaleString('default', { month: 'short' });
      }),
      datasets: [
        {
          label: 'Additions',
          data: Array(12).fill().map(() => Math.floor(Math.random() * 1000 + 500)),
          borderColor: 'rgba(76, 175, 80, 1)',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Deletions',
          data: Array(12).fill().map(() => Math.floor(Math.random() * 500 + 200)),
          borderColor: 'rgba(244, 67, 54, 1)',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: getChartOptions('Code frequency (additions vs deletions)')
  });
  
  state.charts.repoPunchCard = new Chart(punchCardCtx, {
    type: 'radar',
    data: {
      labels: ['12am', '3am', '6am', '9am', '12pm', '3pm', '6pm', '9pm'],
      datasets: [
        {
          label: 'Monday',
          data: [1, 0, 0, 2, 8, 12, 10, 5],
          backgroundColor: 'rgba(110, 64, 201, 0.2)',
          borderColor: 'rgba(110, 64, 201, 1)',
          borderWidth: 1
        },
        {
          label: 'Wednesday',
          data: [0, 0, 1, 3, 10, 15, 12, 6],
          backgroundColor: 'rgba(58, 168, 168, 0.2)',
          borderColor: 'rgba(58, 168, 168, 1)',
          borderWidth: 1
        },
        {
          label: 'Friday',
          data: [2, 1, 0, 4, 12, 18, 15, 8],
          backgroundColor: 'rgba(255, 107, 107, 0.2)',
          borderColor: 'rgba(255, 107, 107, 1)',
          borderWidth: 1
        }
      ]
    },
    options: getChartOptions('Punch card (commit activity by time of day)')
  });
}

function getChartOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333',
        font: {
          size: 14
        }
      },
      legend: {
        labels: {
          color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333'
        }
      }
    },
    scales: {
      r: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        angleLines: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        pointLabels: {
          color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333'
        },
        ticks: {
          color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333',
          backdropColor: 'transparent'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333'
        }
      }
    }
  };
}

function loadProfile(username) {
  showLoading('Loading profile', `Fetching profile for ${username}...`);
  
  fetchProfile(username)
    .then(profile => {
      state.profile = profile;
      renderProfile(profile);
      hideLoading();
    })
    .catch(error => {
      hideLoading();
      showToast('Error', `Failed to load profile: ${error.message}`, 'error');
    });
}

function loadGists(username) {
  showLoading('Loading gists', `Fetching gists for ${username}...`);
  
  fetchGists(username)
    .then(gists => {
      state.gists = gists;
      renderGists(gists);
      hideLoading();
    })
    .catch(error => {
      hideLoading();
      showToast('Error', `Failed to load gists: ${error.message}`, 'error');
    });
}

function loadInsights(username) {
  showLoading('Loading insights', `Analyzing data for ${username}...`);
  
  fetchInsights(username)
    .then(insights => {
      state.insights = insights;
      renderInsights(insights);
      hideLoading();
    })
    .catch(error => {
      hideLoading();
      showToast('Error', `Failed to load insights: ${error.message}`, 'error');
    });
}

function loadMoreRepos() {
  if (!state.currentUser || state.loading || !state.hasMoreRepos) return;
  
  state.repoPage += 1;
  showLoading('Loading more', `Fetching page ${state.repoPage} of repositories...`);
  
  fetchRepos(state.currentUser, state.repoPage)
    .then(repos => {
      if (repos.length < config.MAX_REPOS_PER_PAGE) {
        state.hasMoreRepos = false;
        document.getElementById('loadMoreBtn').classList.add('hidden');
      }
      
      state.repos = [...state.repos, ...repos];
      renderRepos(repos);
      hideLoading();
    })
    .catch(error => {
      hideLoading();
      showToast('Error', `Failed to load more repositories: ${error.message}`, 'error');
    });
}

function updateQuickStats() {
  if (!state.repos || state.repos.length === 0) return;
  
  const repoCount = state.repos.length;
  const starCount = state.repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const forkCount = state.repos.reduce((sum, repo) => sum + repo.forks_count, 0);
  
  // Get top language
  const languages = {};
  state.repos.forEach(repo => {
    if (repo.language) {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    }
  });
  
  const topLanguage = Object.keys(languages).length > 0 
    ? Object.entries(languages).sort((a, b) => b[1] - a[1])[0][0] 
    : '-';
  
  // Update DOM
  document.getElementById('repoCount').textContent = repoCount;
  document.getElementById('starCount').textContent = abbreviateNumber(starCount);
  document.getElementById('forkCount').textContent = abbreviateNumber(forkCount);
  document.getElementById('topLanguage').textContent = topLanguage;
}

function applyAdvancedSearch() {
  const searchType = document.getElementById('searchType').value;
  const sortBy = document.getElementById('sortBy').value;
  const languageFilter = document.getElementById('languageFilter').value;
  const createdFilter = document.getElementById('createdFilter').value;
  const includeForks = document.getElementById('forkFilter').checked;
  
  let query = document.getElementById('username').value.trim();
  
  
  // Build query based on search type
  if (searchType === 'org') {
    query = `org:${query}`;
  } else if (searchType === 'topic') {
    query = `topic:${query}`;
  }
  
  // Add language filter
  if (languageFilter) {
    query += ` language:${languageFilter}`;
  }
  
  // Add created filter
  if (createdFilter) {
    query += ` created:${createdFilter}`;
  }
  
  // Add fork filter
  if (!includeForks) {
    query += ` fork:false`;
  }
  
  // Update search input
  document.getElementById('username').value = query;
  
  // Close modal and perform search
  closeAdvancedSearch();
  fetchEverything();
}

function copyFileContent() {
  const content = document.getElementById('fileContent').textContent;
  navigator.clipboard.writeText(content)
    .then(() => showToast('Copied', 'File content copied to clipboard', 'success'))
    .catch(() => showToast('Error', 'Failed to copy content', 'error'));
}

function downloadFile() {
  const content = document.getElementById('fileContent').textContent;
  const filename = document.getElementById('modalFileTitle').textContent;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function closeFileModal() {
  closeModal('fileModal');
}

function generateColorPalette(count) {
  const baseColors = [
    '#6e40c9', '#3aa8a8', '#ff6b6b', '#ffa940', '#4caf50', 
    '#2196f3', '#607d8b', '#9c27b0', '#e91e63', '#ff5722'
  ];
  
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  
  return 'just now';
}

function abbreviateNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
