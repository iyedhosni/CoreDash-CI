const API_BASE = 'http://localhost:3000/api/sonarqube';
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

    // Format date to relative time
    function formatRelativeTime(dateString) {
        if (!dateString) return 'Never analyzed';
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        
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
    function updateStats(projects) {
        const total = projects.length;
        const passed = projects.filter(p => p.qualityGate === 'OK').length;
        const failed = projects.filter(p => p.qualityGate === 'ERROR').length;
        const avgCoverage = total > 0 
            ? projects.reduce((sum, p) => sum + (p.coverage || 0), 0) / total
            : 0;

        document.getElementById('total-projects').textContent = total;
        document.getElementById('passed-projects').textContent = passed;
        document.getElementById('failed-projects').textContent = failed;
        document.getElementById('avg-coverage').textContent = total > 0 
            ? `${avgCoverage.toFixed(1)}%` 
            : '0%';
    }

    // Load projects from API
    async function loadProjects() {
        const btn = document.getElementById('refresh-btn');
        btn.classList.add('loading');

        try {
            const res = await authFetch(`${API_BASE}/projects/search`);
            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            const projects = data.components || [];

            // Fetch measures for each project
            const projectsWithMeasures = await Promise.all(projects.map(async project => {
                try {
                    const measuresRes = await authFetch(`${API_BASE}/measures/component?component=${project.key}&metricKeys=alert_status,bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density`);
                    if (!measuresRes.ok) throw new Error('Measures fetch failed');
                    const measuresData = await measuresRes.json();
                    
                    // Extract measures
                    const measures = {};
                    if (measuresData.component && measuresData.component.measures) {
                        measuresData.component.measures.forEach(measure => {
                            measures[measure.metric] = measure.value;
                        });
                    }
                    
                    return {
                        ...project,
                        qualityGate: measures.alert_status || 'N/A',
                        bugs: measures.bugs || 0,
                        vulnerabilities: measures.vulnerabilities || 0,
                        codeSmells: measures.code_smells || 0,
                        coverage: measures.coverage ? parseFloat(measures.coverage) : 0,
                        duplications: measures.duplicated_lines_density ? parseFloat(measures.duplicated_lines_density) : 0
                    };
                } catch (e) {
                    console.error(`Error loading measures for ${project.key}`, e);
                    return {
                        ...project,
                        qualityGate: 'N/A',
                        bugs: 0,
                        vulnerabilities: 0,
                        codeSmells: 0,
                        coverage: 0,
                        duplications: 0
                    };
                }
            }));

            renderProjectsTable(projectsWithMeasures);
            updateStats(projectsWithMeasures);
        } catch (e) {
            console.error('Projects load failed', e);
            renderErrorState('Failed to load projects. Please try again.');
        } finally {
            btn.classList.remove('loading');
        }
    }
    async function loadCeActivity() {
    const container = document.getElementById('ce-activity-container');
    
    try {
        // Show loading state
        container.innerHTML = `
            <div class="ce-empty-state">
                <div class="ce-empty-icon">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <h3 class="ce-empty-title">Loading activity...</h3>
                <p class="ce-empty-description">Fetching recent analysis tasks</p>
            </div>
        `;
        
        const res = await authFetch(`${API_BASE}/ce/activity`);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        
        const tasks = data.tasks || [];
        
        if (!tasks.length) {
            container.innerHTML = `
                <div class="ce-empty-state">
                    <div class="ce-empty-icon">
                        <i class="fas fa-folder-open"></i>
                    </div>
                    <h3 class="ce-empty-title">No recent activity</h3>
                    <p class="ce-empty-description">No analysis tasks found in the queue</p>
                </div>
            `;
            return; 
        }
        
        // Sort tasks by submittedAt (newest first by default)
        tasks.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        
        renderCeTasks(tasks);
        setupCeFilters(tasks);
        setupCeSorting(tasks);
        
    } catch (e) {
        console.error('Failed to load CE activity:', e);
        container.innerHTML = `
            <div class="ce-empty-state">
                <div class="ce-empty-icon text-red-500">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="ce-empty-title">Error loading activity</h3>
                <p class="ce-empty-description">Failed to fetch analysis tasks. Please try again.</p>
                <button onclick="loadCeActivity()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Retry
                </button>
            </div>
        `;
    }
}

function renderCeTasks(tasks, filter = 'all') {
    const container = document.getElementById('ce-activity-container');
    container.innerHTML = '';

    const filteredTasks = filter === 'all' 
        ? tasks 
        : tasks.filter(task => task.status === filter);

    if (!filteredTasks.length) {
        container.innerHTML = `
            <div class="ce-empty-state">
                <div class="ce-empty-icon">
                    <i class="fas fa-filter"></i>
                </div>
                <h3 class="ce-empty-title">No tasks match your filter</h3>
                <p class="ce-empty-description">Try changing the filter criteria</p>
            </div>
        `;
        return;
    }

    const visibleCount = 5;
    const taskList = document.createElement('div');
    taskList.id = 'ce-task-list';

    const showMoreBtn = document.createElement('button');
    showMoreBtn.textContent = 'Show More';
    showMoreBtn.className = 'ce-show-more-btn';
    showMoreBtn.onclick = () => {
        renderTaskCards(filteredTasks); // Render full list on click
        showMoreBtn.remove(); // Remove the button after expanding
    };

    function renderTaskCards(list) {
        taskList.innerHTML = list.map((task, index) => {
            const statusClass = getCeStatusClass(task.status);
            const statusIcon = getCeStatusIcon(task.status);
            const executionTime = task.executionTimeMs ? (task.executionTimeMs / 1000).toFixed(1) + 's' : '-';
            const progress = task.status === 'IN_PROGRESS' ? Math.min(Math.floor((task.executionTimeMs || 0) / 1000 * 100), 95) : 100;
            const hasError = task.errorMessage || (task.status === 'FAILED' && !task.errorMessage);

            return `
                <div class="ce-task-card ${statusClass} ${document.documentElement.classList.contains('dark') ? 'dark' : ''}" onclick="showCeTaskDetails('${task.id}')">
                    <div class="ce-task-header">
                        <div class="ce-task-title">
                            <span>${task.componentName || 'Unnamed Project'}</span>
                            <span class="ce-status-badge ${statusClass}">
                                <i class="fas fa-${statusIcon}"></i>
                                ${formatCeStatus(task.status)}
                            </span>
                        </div>
                        <div class="ce-task-time">
                            ${formatRelativeTime(task.submittedAt)}
                        </div>
                    </div>
                    
                    <div class="ce-task-meta">
                        <div class="ce-task-meta-item">
                            <i class="fas fa-code-branch"></i>
                            <span>${task.branch || 'main'}</span>
                        </div>
                        <div class="ce-task-meta-item">
                            <i class="fas fa-tasks"></i>
                            <span>${task.type}</span>
                        </div>
                        ${task.analysisId ? `
                        <div class="ce-task-meta-item">
                            <i class="fas fa-hashtag"></i>
                            <span>${task.analysisId.substring(0, 8)}</span>
                        </div>` : ''}
                    </div>
                    
                    ${hasError ? `
                    <div class="text-sm text-red-500 mb-2">
                        <i class="fas fa-exclamation-circle mr-1"></i>
                        ${task.errorMessage || 'Analysis failed without error message'}
                    </div>` : ''}
                    
                    ${task.status === 'IN_PROGRESS' ? `
                    <div class="ce-task-progress">
                        <div class="ce-task-progress-bar" style="width: ${progress}%"></div>
                    </div>` : ''}
                    
                    <div class="ce-task-footer">
                        <div class="ce-task-duration">
                            <i class="fas fa-clock mr-1"></i>
                            ${executionTime}
                        </div>
                        <div class="ce-task-actions">
                            ${task.analysisId ? `
                            <a href="${task.dashboardUrl}" target="_blank" class="ce-task-action" onclick="event.stopPropagation()">
                                <i class="fas fa-external-link-alt"></i>
                                View
                            </a>` : ''}
                            <span class="ce-task-action" onclick="event.stopPropagation(); showCeTaskDetails('${task.id}')">
                                <i class="fas fa-info-circle"></i>
                                Details
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Initially render only the first 5
    renderTaskCards(filteredTasks.slice(0, visibleCount));

    container.appendChild(taskList);
    if (filteredTasks.length > visibleCount) {
        container.appendChild(showMoreBtn);
    }
}


function setupCeFilters(tasks) {
    const filterButtons = document.querySelectorAll('#ce-filters .ce-filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            renderCeTasks(tasks, filter);
        });
    });
}

function setupCeSorting(tasks) {
    const sortSelect = document.getElementById('ce-sort-select');
    sortSelect.addEventListener('change', () => {
        const sortBy = sortSelect.value;
        let sortedTasks = [...tasks];
        
        switch(sortBy) {
            case 'newest':
                sortedTasks.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
                break;
            case 'oldest':
                sortedTasks.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
                break;
            case 'duration':
                sortedTasks.sort((a, b) => (b.executionTimeMs || 0) - (a.executionTimeMs || 0));
                break;
        }
        
        const currentFilter = document.querySelector('#ce-filters .ce-filter-btn.active').dataset.filter;
        renderCeTasks(sortedTasks, currentFilter);
    });
}

function getCeStatusClass(status) {
    switch(status) {
        case 'SUCCESS': return 'SUCCESS';
        case 'FAILED': return 'ERROR';
        case 'IN_PROGRESS': return 'IN_PROGRESS';
        case 'PENDING': return 'PENDING';
        default: return '';
    }
}

function getCeStatusIcon(status) {
    switch(status) {
        case 'SUCCESS': return 'check-circle';
        case 'FAILED': return 'times-circle';
        case 'IN_PROGRESS': return 'spinner';
        case 'PENDING': return 'clock';
        default: return 'question-circle';
    }
}

function formatCeStatus(status) {
    switch(status) {
        case 'SUCCESS': return 'Success';
        case 'FAILED': return 'Failed';
        case 'IN_PROGRESS': return 'In Progress';
        case 'PENDING': return 'Pending';
        default: return status;
    }
}

    // Render projects table
    function renderProjectsTable(projects) {
        const container = document.getElementById('projects-container');
        if (!projects.length) {
            container.innerHTML = `<div class="empty-state">No projects found.</div>`;
            return;
        }

        projects.sort((a, b) => {
            if (a.qualityGate === 'ERROR' && b.qualityGate !== 'ERROR') return -1;
            if (a.qualityGate !== 'ERROR' && b.qualityGate === 'ERROR') return 1;
            return (b.lastAnalysisDate || '').localeCompare(a.lastAnalysisDate || '');
        });

        const rows = projects.map(project => {
            return `
                <tr class="project-row ${document.documentElement.classList.contains('dark') ? 'dark-row' : ''}" data-project="${project.key}">
                    <td>
                        <div class="font-medium">${project.name}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${project.key}</div>
                    </td>
                    <td>
                        <div class="status-badge ${project.qualityGate === 'OK' ? 'SUCCESS' : project.qualityGate === 'ERROR' ? 'ERROR' : 'WARNING'}">
                            <span class="status-dot"></span>
                            ${project.qualityGate === 'OK' ? 'Passed' : project.qualityGate === 'ERROR' ? 'Failed' : 'Warning'}
                        </div>
                    </td>
                    <td>${project.bugs}</td>
                    <td>${project.vulnerabilities}</td>
                    <td>${project.codeSmells}</td>
                    <td>${project.coverage.toFixed(1)}%</td>
                    <td>${project.duplications.toFixed(1)}%</td>
                    <td>${formatRelativeTime(project.lastAnalysisDate)}</td>
                    <td>
                        <button class="action-btn" onclick="event.stopPropagation(); showProjectDetails('${project.key}')">
                            <i class="fas fa-search"></i>
                            <span>Details</span>
                        </button>
                    </td>
                </tr>`;
        }).join('');

        container.innerHTML = `
            <table class="projects-table">
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Quality Gate</th>
                        <th>Bugs</th>
                        <th>Vulnerabilities</th>
                        <th>Code Smells</th>
                        <th>Coverage</th>
                        <th>Duplications</th>
                        <th>Last Analysis</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;

        // Attach events
        container.querySelectorAll('.project-row').forEach(row => {
            row.addEventListener('click', () => showProjectDetails(row.dataset.project));
        });
    }

    // Show project details
   
    // Render error state
    function renderErrorState(msg) {
    const container = document.getElementById('jobs-container');
    container.innerHTML = `
        <div class="empty-state">
        <h3>Error</h3>
        <p>${msg}</p>
        <button id="retry-btn">
            <i class="fas fa-sync-alt"></i> Retry
        </button>
        </div>`;
    document.getElementById('retry-btn').addEventListener('click', loadJobs);
    }

    // Initialize dashboard
    function initDashboard() {
    syncTheme();
    loadProjects();
    loadCeActivity();

    autoRefreshInterval = setInterval(() => {
        if (isAutoRefreshEnabled) loadProjects();
    }, 5000);

    document.getElementById('refresh-btn').addEventListener('click', loadProjects);
    document.addEventListener('visibilitychange', () => {
        isAutoRefreshEnabled = !document.hidden;
    });

    // Add this to handle Escape key press
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('project-details-modal').classList.add('hidden');
        }
    });
}
// Add these functions to your existing JS:

function showProjectDetails(projectKey) {
    const modal = document.getElementById('project-details-modal');
    const content = document.getElementById('project-details-content');
    
    // Show loading state
    content.innerHTML = `
        <div class="flex justify-center items-center h-64">
            <i class="fas fa-spinner fa-spin text-2xl text-gray-500"></i>
        </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Fetch project details (mock implementation - replace with your actual API call)
    fetchProjectDetails(projectKey).then(project => {
        content.innerHTML = `
            <div class="space-y-4">
                <div>
                    <h4 class="text-lg font-medium dark:text-white">${project.name}</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${project.key}</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h5 class="font-medium dark:text-white">Quality Gate</h5>
                        <p class="${project.qualityGate === 'OK' ? 'text-green-600' : 'text-red-600'}">
                            ${project.qualityGate === 'OK' ? 'Passed' : 'Failed'}
                        </p>
                    </div>
                    
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h5 class="font-medium dark:text-white">Coverage</h5>
                        <p>${project.coverage.toFixed(1)}%</p>
                    </div>
                    
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h5 class="font-medium dark:text-white">Bugs</h5>
                        <p>${project.bugs}</p>
                    </div>
                    
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h5 class="font-medium dark:text-white">Vulnerabilities</h5>
                        <p>${project.vulnerabilities}</p>
                    </div>
                </div>
                
                <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h5 class="font-medium dark:text-white">Last Analysis</h5>
                    <p>${formatRelativeTime(project.lastAnalysisDate)}</p>
                </div>
            </div>
        `;
    }).catch(error => {
        content.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-4"></i>
                <p class="text-red-500">Failed to load project details</p>
                <button onclick="showProjectDetails('${projectKey}')" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Retry
                </button>
            </div>
        `;
    });
    
    // Close modal handler
    document.getElementById('close-details-modal').onclick = () => {
        modal.classList.add('hidden');
    };
}
async function showCeTaskDetails(taskId) {
    const modal = document.getElementById('ce-task-modal');
    const content = document.getElementById('ce-task-details-content');

    // Show the modal and display a loading spinner
    modal.classList.remove('hidden');
    content.innerHTML = `
        <div class="flex justify-center items-center h-40">
            <i class="fas fa-spinner fa-spin text-2xl text-gray-500"></i>
        </div>
    `;

    try {
        // Fetch task details
        const taskRes = await authFetch(`${API_BASE}/ce/task/${taskId}`);
        if (!taskRes.ok) throw new Error('Task not found');
        const { task } = await taskRes.json();

        // Fetch component details
        const componentKey = task.componentKey;
        const projectRes = await authFetch(`${API_BASE}/components/show?component=${componentKey}`);
        const component = projectRes.ok ? (await projectRes.json()).component : {};

        // Fetch measures
        const measureRes = await authFetch(`${API_BASE}/measures/component?component=${componentKey}&metricKeys=ncloc,files,coverage,duplicated_lines_density`);
        const measures = measureRes.ok ? (await measureRes.json()).component.measures.reduce((acc, m) => ({ ...acc, [m.metric]: m.value }), {}) : {};

        // Fetch quality gate details if available
        let qualityGateBlock = '';
        if (task.analysisId) {
            const qgRes = await authFetch(`${API_BASE}/qualitygates/project_status?analysisId=${task.analysisId}`);
            if (qgRes.ok) {
                const qg = await qgRes.json();
                const conditions = qg.projectStatus.conditions.map(c => `
                    <li class="${c.status === 'ERROR' ? 'text-red-500' : 'text-green-500'}">
                        ${c.metricKey}: ${c.status}
                    </li>`).join('');

                qualityGateBlock = `
                    <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                        <h5 class="font-medium dark:text-white">Quality Gate: ${qg.projectStatus.status}</h5>
                        <ul class="list-disc pl-5 mt-2">${conditions}</ul>
                    </div>`;
            }
        }

        // Render task details
        content.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="text-lg font-semibold dark:text-white">${task.componentName || 'Unnamed Project'}</h4>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Task ID: ${task.id}</p>
                        ${task.branch ? `<p class="text-sm text-gray-500 dark:text-gray-400">Branch: ${task.branch}</p>` : ''}
                    </div>
                    <a href="${task.dashboardUrl || '#'}" target="_blank" class="text-blue-500 hover:underline">
                        <i class="fas fa-external-link-alt mr-1"></i> View on SonarQube
                    </a>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                        <h5 class="font-medium dark:text-white">Execution</h5>
                        <p><strong>Status:</strong> ${task.status}</p>
                        <p><strong>Type:</strong> ${task.type}</p>
                        <p><strong>Submitted:</strong> ${new Date(task.submittedAt).toLocaleString()}</p>
                        <p><strong>Duration:</strong> ${task.executionTimeMs ? (task.executionTimeMs / 1000).toFixed(1) + 's' : 'N/A'}</p>
                        <p><strong>Executor:</strong> ${task.executorUsername || 'N/A'}</p>
                    </div>

                    <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                        <h5 class="font-medium dark:text-white">Component</h5>
                        <p><strong>Key:</strong> ${component.key || '-'}</p>
                        <p><strong>Visibility:</strong> ${component.visibility || 'N/A'}</p>
                        <p><strong>Lines of Code:</strong> ${measures.ncloc || 0}</p>
                        <p><strong>Files:</strong> ${measures.files || 0}</p>
                    </div>
                </div>

                ${qualityGateBlock}

                ${task.errorMessage ? `
                    <div class="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
                        <h5 class="font-medium text-red-800 dark:text-red-300">Error Message</h5>
                        <pre class="mt-2 text-sm overflow-x-auto">${task.errorMessage}</pre>
                    </div>` : ''}

                ${task.logs ? `
                    <div>
                        <a href="${task.logs}" target="_blank" class="text-blue-500 underline">
                            <i class="fas fa-file-alt mr-1"></i> View Logs
                        </a>
                    </div>` : ''}
            </div>
        `;
    } catch (e) {
        console.error(e);
        content.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-4"></i>
                <p class="text-red-500">Failed to load task details</p>
                <button onclick="showCeTaskDetails('${taskId}')" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Retry
                </button>
            </div>
        `;
    }

    // Modal close events
    document.getElementById('close-ce-task-modal').onclick = () => modal.classList.add('hidden');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}

// Mock function - replace with your actual API call
async function fetchProjectDetails(projectKey) {
    // This is just a mock - replace with your actual API call
    const res = await authFetch(`${API_BASE}/measures/component?component=${projectKey}&metricKeys=alert_status,bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density`);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    
    // Find the project in our existing data
    const projects = await (await authFetch(`${API_BASE}/projects/search`)).json();
    const project = projects.components.find(p => p.key === projectKey);
    
    // Extract measures
    const measures = {};
    if (data.component && data.component.measures) {
        data.component.measures.forEach(measure => {
            measures[measure.metric] = measure.value;
        });
    }
    
    return {
        ...project,
        qualityGate: measures.alert_status || 'N/A',
        bugs: measures.bugs || 0,
        vulnerabilities: measures.vulnerabilities || 0,
        codeSmells: measures.code_smells || 0,
        coverage: measures.coverage ? parseFloat(measures.coverage) : 0,
        duplications: measures.duplicated_lines_density ? parseFloat(measures.duplicated_lines_density) : 0
    };
}

// Add click handler to close modal when clicking outside content
document.getElementById('project-details-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('project-details-modal')) {
        document.getElementById('project-details-modal').classList.add('hidden');
    }
});
    document.addEventListener('DOMContentLoaded', initDashboard);

function authFetch(url, options = {}) {
    const token = localStorage.getItem('accessToken');
    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
}