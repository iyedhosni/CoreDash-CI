const API_BASE = 'http://localhost:3000/api/nexus';
        let currentRepo = null;
        let currentTask = null;

        // DOM elements
        const themeToggle = document.getElementById('themeToggle');
        const refreshBtn = document.getElementById('refreshBtn');
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');

        // Stats elements
        const totalReposEl = document.getElementById('totalRepos');
        const hostedReposEl = document.getElementById('hostedRepos');
        const proxyReposEl = document.getElementById('proxyRepos');
        const storageUsedEl = document.getElementById('storageUsed');

        // Tables and modals
        const repositoriesList = document.getElementById('repositories-list');
        const tasksList = document.getElementById('tasks-list');
        const scriptsList = document.getElementById('scripts-list');
        const searchQuery = document.getElementById('searchQuery');
        const searchBtn = document.getElementById('searchBtn');
        const searchResults = document.getElementById('search-results');

        const repoDetailModal = document.getElementById('repoDetailModal');
        const repoDetailJson = document.getElementById('repoDetailJson');
        document.getElementById('closeRepoModal').addEventListener('click', () => repoDetailModal.classList.remove('active'));
        document.getElementById('deleteRepoBtn').addEventListener('click', () => deleteRepository(currentRepo));
        document.getElementById('runRepoTaskBtn').addEventListener('click', () => runRepositoryTask(currentRepo));

        const taskDetailModal = document.getElementById('taskDetailModal');
        const taskDetailJson = document.getElementById('taskDetailJson');
        document.getElementById('closeTaskModal').addEventListener('click', () => taskDetailModal.classList.remove('active'));
        document.getElementById('runTaskBtn').addEventListener('click', () => runTask(currentTask));
        document.getElementById('stopTaskBtn').addEventListener('click', () => stopTask(currentTask));

        // Theme toggle
        function syncTheme() {
        try {
            if (window.parent !== window) {
                const update = () => {
                    const isDark = window.parent.document.documentElement.classList.contains('dark');
                    
                    document.body.classList.toggle('dark', isDark);
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
    syncTheme()
        
        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
                switch (tab.dataset.tab) {
                    case 'repositories': loadRepositories(); break;
                    case 'tasks': loadTasks(); break;
                    case 'scripts': loadScripts(); break;
                }
            });
        });

        // Refresh button listener
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('loading');
            const activeTab = document.querySelector('.tab.active').dataset.tab;
            if (activeTab === 'repositories') {
                loadRepositories();
            } else if (activeTab === 'tasks') {
                loadTasks();
            } else if (activeTab === 'scripts') {
                loadScripts();
            }
            setTimeout(() => refreshBtn.classList.remove('loading'), 500);
        });

        // Search button
        searchBtn.addEventListener('click', () => searchComponents());

        // Load repositories
                async function loadRepositories() {
            try {
                const res = await fetch(`${API_BASE}/repositories`, {
                    headers: getAuthHeaders()
                });
                const repos = await res.json();
                repositoriesList.innerHTML = '';
                repos.forEach(repo => {
                    // Map online status
                    const isOnline = repo.online !== false; // Default to true if not specified
                    const statusText = isOnline ? 'Online' : 'Offline';
                    const statusClass = isOnline ? 'SUCCESS' : 'ERROR';
        
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${repo.name}</td>
                        <td><span class="repo-type-badge ${repo.type}">${repo.type}</span></td>
                        <td><span class="format-badge">${repo.format}</span></td>
                        <td>
                            <span class="status-badge ${statusClass}">
                                <span class="status-dot"></span>${statusText}
                            </span>
                        </td>
                        <td>${repo.lastUpdated ? new Date(repo.lastUpdated).toLocaleString() : 'N/A'}</td>
                        <td class="repo-actions">
                            <button class="repo-action-btn view" onclick='viewRepoDetails(${JSON.stringify(repo)})'>
                                <i class="fas fa-info-circle"></i> Details
                            </button>
                            <button class="repo-action-btn delete" onclick='deleteRepository("${repo.name}")'>
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </td>`;
                    repositoriesList.appendChild(tr);
                });
                totalReposEl.textContent = repos.length;
                hostedReposEl.textContent = repos.filter(r => r.type === 'hosted').length;
                proxyReposEl.textContent = repos.filter(r => r.type === 'proxy').length;
                storageUsedEl.textContent = repos.reduce((sum, r) => sum + (r.size || 0), 0).toFixed(2) + ' MB';
            } catch (e) {
                console.error(e);
            }
        }

        // Load tasks
        async function loadTasks() {
            try {
                const res = await fetch(`${API_BASE}/tasks`, {
                    headers: getAuthHeaders()
                });
                const tasks = await res.json();
                tasksList.innerHTML = '';
                tasks.forEach(task => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${task.id}</td>
                        <td>${task.name}</td>
                        <td>${task.type}</td>
                        <td><span class="status-badge ${task.status}"><span class="status-dot"></span>${task.status}</span></td>
                        <td>${new Date(task.lastRun).toLocaleString()}</td>
                        <td>${new Date(task.nextRun).toLocaleString()}</td>
                        <td>
                            <button class="repo-action-btn view" onclick='viewTaskDetails(${JSON.stringify(task)})'><i class="fas fa-info-circle"></i></button>
                        </td>`;
                    tasksList.appendChild(tr);
                });
            } catch (e) {
                console.error(e);
            }
        }

        // Load scripts
        async function loadScripts() {
            try {
                const res = await fetch(`${API_BASE}/scripts`, {
                    headers: getAuthHeaders()
                });
                const scripts = await res.json();
                scriptsList.innerHTML = '';
                scripts.forEach(script => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${script.name}</td>
                        <td>${script.type}</td>
                        <td>${new Date(script.lastModified).toLocaleString()}</td>
                        <td>
                            <button class="repo-action-btn view" onclick='viewScript(${JSON.stringify(script)})'><i class="fas fa-eye"></i></button>
                        </td>`;
                    scriptsList.appendChild(tr);
                });
            } catch (e) {
                console.error(e);
            }
        }

        // Search components
        async function searchComponents() {
            try {
                const q = encodeURIComponent(searchQuery.value);
                const res = await fetch(`${API_BASE}/search?query=${q}`);
                const items = await res.json();
                searchResults.innerHTML = '';
                items.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${item.name}</td>
                        <td>${item.repository}</td>
                        <td>${item.format}</td>
                        <td>${item.version}</td>
                        <td>${new Date(item.lastModified).toLocaleString()}</td>`;
                    searchResults.appendChild(tr);
                });
            } catch (e) {
                console.error(e);
            }
        }

        // View details modals
        function viewRepoDetails(repo) {
            currentRepo = repo.name;
            repoDetailJson.textContent = JSON.stringify(repo, null, 2);
            loadRepoFileTree(repo.name);
    repoDetailModal.classList.add('active');
        }
        function viewTaskDetails(task) {
            currentTask = task.id;
            taskDetailJson.textContent = JSON.stringify(task, null, 2);
            taskDetailModal.classList.add('active');
        }
        function viewScript(script) {
            alert(`Script: ${script.name}\nType: ${script.type}`);
        }

        // Actions
        async function deleteRepository(name) {
            if (!confirm(`Delete repository '${name}'?`)) return;
            await fetch(`${API_BASE}/repositories/${encodeURIComponent(name)}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            loadRepositories();
        }
        async function runRepositoryTask(name) {
            await fetch(`${API_BASE}/repositories/${encodeURIComponent(name)}/run`, { method: 'POST', headers: getAuthHeaders() });
            alert('Task triggered');
        }
        async function runTask(id) {
            await fetch(`\`${API_BASE}/tasks/${id}/run\``, { method: 'POST', headers: getAuthHeaders() });
            alert('Task started');
        }
        async function stopTask(id) {
            await fetch(`${API_BASE}/tasks/${id}/stop`, { method: 'POST', headers: getAuthHeaders() });
            alert('Task stopped');
        }
function viewRepoDetails(repo) {
            currentRepo = repo.name;
            
            // Update modal title
            document.getElementById('repoDetailTitle').textContent = `Repository: ${repo.name}`;
            document.getElementById('repoDetailName').textContent = repo.name;
            document.getElementById('repoDetailNameValue').textContent = repo.name;
            
            // Update type and format badges
            document.getElementById('repoDetailTypeValue').textContent = repo.type;
            document.getElementById('repoDetailTypeBadge').textContent = repo.type;
            document.getElementById('repoDetailTypeBadge').className = `repo-type-badge ${repo.type}`;
            
            document.getElementById('repoDetailFormatValue').textContent = repo.format;
            document.getElementById('repoDetailFormatBadge').textContent = repo.format;
            
            // Update status
            const isOnline = repo.online !== false; // default to true if not specified
            const statusText = isOnline ? 'Online' : 'Offline';
            const statusClass = isOnline ? 'SUCCESS' : 'ERROR';
            document.getElementById('repoDetailStatusValue').textContent = statusText;
            const statusBadge = document.getElementById('repoDetailStatusBadge');
            statusBadge.className = `status-badge ${statusClass}`;
            statusBadge.innerHTML = `<span class="status-dot"></span>${statusText}`;
            
            // Update URL
            document.getElementById('repoDetailUrlValue').textContent = repo.url || 'N/A';
            
            // Update storage information
            const sizeInMB = repo.size ? (repo.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A';
            document.getElementById('repoDetailSizeValue').textContent = sizeInMB;
            document.getElementById('repoDetailBlobStoreValue').textContent = repo.blobStoreName || 'default';
            
            // Calculate and display storage usage
            if (repo.size && repo.totalSize) {
                const usagePercent = Math.round((repo.size / repo.totalSize) * 100);
                document.getElementById('repoDetailUsageValue').textContent = `${usagePercent}% used`;
                document.getElementById('repoStorageProgress').style.width = `${usagePercent}%`;
            } else {
                document.getElementById('repoDetailUsageValue').textContent = 'N/A';
                document.getElementById('repoStorageProgress').style.width = '0%';
            }
            
            // Update activity dates
            document.getElementById('repoDetailCreatedValue').textContent = 
                repo.created ? new Date(repo.created).toLocaleString() : 'N/A';
            document.getElementById('repoDetailUpdatedValue').textContent = 
                repo.lastUpdated ? new Date(repo.lastUpdated).toLocaleString() : 'N/A';
            document.getElementById('repoDetailDownloadedValue').textContent = 
                repo.lastDownloaded ? new Date(repo.lastDownloaded).toLocaleString() : 'Never';
            
            // Update statistics
            document.getElementById('repoDetailComponentsCount').textContent = 
                repo.componentCount !== undefined ? repo.componentCount : 'N/A';
            document.getElementById('repoDetailAssetsCount').textContent = 
                repo.assetCount !== undefined ? repo.assetCount : 'N/A';
            document.getElementById('repoDetailDownloadsValue').textContent = 
                repo.weeklyDownloads !== undefined ? repo.weeklyDownloads.toLocaleString() : 'N/A';
            
            // Update configuration JSON with syntax highlighting
            const jsonViewer = document.getElementById('repoDetailJson');
            jsonViewer.innerHTML = syntaxHighlight(JSON.stringify(repo.configuration || repo, null, 2));
            
            // Load components if available
            if (repo.components && repo.components.length > 0) {
                const componentsList = document.getElementById('repoComponentsList');
                componentsList.innerHTML = '';
                repo.components.slice(0, 20).forEach(component => {
                    const div = document.createElement('div');
                    div.className = 'repo-component-item';
                    div.innerHTML = `
                        <span class="repo-component-name">${component.name}</span>
                        <span class="repo-component-size">${formatBytes(component.size)}</span>
                    `;
                    componentsList.appendChild(div);
                });
                
                if (repo.components.length > 20) {
                    const div = document.createElement('div');
                    div.className = 'repo-component-item';
                    div.innerHTML = `
                        <span class="repo-component-name">...and ${repo.components.length - 20} more</span>
                        <span class="repo-component-size"></span>
                    `;
                    componentsList.appendChild(div);
                }
            }
            
            // Add tab switching functionality
            document.querySelectorAll('.detail-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.detail-tab-content').forEach(c => c.classList.remove('active'));
                    tab.classList.add('active');
                    document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
                });
            });
            
            // Show the modal
            loadRepoFileTree(repo.name);
    repoDetailModal.classList.add('active');
        }
        
        // Helper function to format bytes
        function formatBytes(bytes, decimals = 2) {
            if (bytes === 0) return '0 Bytes';
            if (!bytes) return 'N/A';
            
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }
        
        // Helper function for JSON syntax highlighting
        function syntaxHighlight(json) {
            if (!json) return '';
            
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(
                /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
                function (match) {
                    let cls = 'json-number';
                    if (/^"/.test(match)) {
                        if (/:$/.test(match)) {
                            cls = 'json-key';
                        } else {
                            cls = 'json-string';
                        }
                    } else if (/true|false/.test(match)) {
                        cls = 'json-boolean';
                    } else if (/null/.test(match)) {
                        cls = 'json-null';
                    }
                    return '<span class="' + cls + '">' + match + '</span>';
                }
            );
        }
        
        // Add browse button functionality
        document.getElementById('browseRepoBtn').addEventListener('click', () => {
            if (currentRepo) {
                const repo = getRepoByName(currentRepo);
                if (repo && repo.url) {
                    window.open(repo.url, '_blank');
                } else {
                    alert('No URL available for this repository');
                }
            }
        });
        
        // Helper function to find repo by name (mock implementation)
        function getRepoByName(name) {
            // In a real implementation, you would search your repositories array
            // or make an API call to get the full repo details
            return { name: name, url: `http://nexus-server.example.com/#browse/browse/components:${name}` };
        }
        // Initial load
        loadRepositories();

function renderTree(node, level = 0) {
  const indent = '&nbsp;'.repeat(level * 4);
  let html = `${indent}${node.type === 'folder' ? '📁' : '📄'} ${node.name}<br>`;
  if (node.children) {
    for (const child of node.children) {
      html += renderTree(child, level + 1);
    }
  }
  return html;
}

async function loadRepoFileTree(repoName) {
  try {
    const res = await fetch(`${API_BASE}/project-files/${repoName}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('API error');
    const tree = await res.json();
    const container = document.getElementById('repoFileTree');
    container.innerHTML = '';
    container.appendChild(renderTreeNode(tree));
  } catch (err) {
    document.getElementById('repoFileTree').innerHTML =
      '<span class="text-red-500">Failed to load project files</span>';
  }
}

function renderTreeNode(node, level = 0) {
  const wrapper = document.createElement('div');
  wrapper.style.paddingLeft = `${level * 16}px`;

  const item = document.createElement('div');
  item.style.cursor = 'pointer';
  item.innerHTML = node.type === 'folder' ? `📁 ${node.name}` : `📄 ${node.name}`;
  wrapper.appendChild(item);

  if (node.type === 'folder' && node.children && node.children.length > 0) {
    const childrenContainer = document.createElement('div');
    childrenContainer.style.display = 'none';

    node.children.forEach(child => {
      childrenContainer.appendChild(renderTreeNode(child, level + 1));
    });

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      childrenContainer.style.display =
        childrenContainer.style.display === 'none' ? 'block' : 'none';
    });

    wrapper.appendChild(childrenContainer);
  }

  return wrapper;
}

// Helper to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return token
        ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        : { 'Content-Type': 'application/json' };
}
