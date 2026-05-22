/**
 * Enhanced Build History Management
 * Handles build history visualization and interactions
 */

/**
 * Initialize build history functionality
 */
function initBuildHistory() {
    loadBuilds();
    setupBuildHistoryEventListeners();
}

/**
 * Set up event listeners for build history interactions
 */
function setupBuildHistoryEventListeners() {
    // Handle rebuild button clicks
    document.addEventListener('click', async (event) => {
        const rebuildBtn = event.target.closest('.rebuild-btn');
        if (rebuildBtn) {
            const buildNumber = rebuildBtn.dataset.buildNumber;
            if (buildNumber) {
                await triggerRebuild(buildNumber);
            }
        }

        // Handle view log button clicks
        const viewLogBtn = event.target.closest('.view-log-btn');
        if (viewLogBtn) {
            const buildNumber = viewLogBtn.dataset.buildNumber;
            if (buildNumber) {
                await viewBuildLog(buildNumber);
            }
        }
    });
}

/**
 * Load and display build history
 */
async function loadBuilds() {
    const buildList = document.getElementById('build-list');
    if (!buildList) return;

    try {
        setLoading(true);
        showLoadingState(buildList);

        const response = await fetchWithAuth(
            `${API}/job/${encodeURIComponent(state.jobName)}/api/json?tree=builds[number,status,timestamp,id,result,duration,url,changeSets[items[msg,author[fullName]]]]`
        );

        if (!Array.isArray(response.builds) || response.builds.length === 0) {
            showNoBuildsMessage(buildList);
            return;
        }

        // Sort builds by build number (newest first)
        const builds = response.builds.sort((a, b) => b.number - a.number);
        
        // Render build cards
        renderBuildCards(buildList, builds);
        
        // Update last build status
        if (builds.length > 0) {
            updateLastBuildStatus(builds[0].result);
        }
        
    } catch (error) {
        console.error('Failed to load builds:', error);
        showErrorState(buildList, 'Failed to load build history');
    } finally {
        setLoading(false);
    }
}

/**
 * Render build cards in the build list
 */
function renderBuildCards(container, builds) {
    container.innerHTML = '';
    
    builds.slice(0, 10).forEach(build => { // Limit to 10 most recent builds
        const card = createBuildCard(build);
        if (card) {
            container.appendChild(card);
        }
    });
}

/**
 * Create a build card element
 */
function createBuildCard(build) {
    if (!build) return null;
    
    const card = document.createElement('div');
    card.className = 'build-card';
    card.dataset.buildNumber = build.number;
    
    const statusInfo = getBuildStatusInfo(build.result);
    const buildTime = build.timestamp ? new Date(build.timestamp) : null;
    const formattedTime = buildTime ? formatTime(buildTime.getTime()) : 'N/A';
    
    card.innerHTML = `
        <div class="build-card-header">
            <div class="build-status ${statusInfo.statusClass}">
                <i class="fas ${statusInfo.icon}"></i>
            </div>
            <div class="build-info">
                <div class="build-number">#${build.number}</div>
                <div class="build-time" title="${buildTime || 'N/A'}">${formattedTime}</div>
            </div>
            ${build.duration ? `
                <div class="build-duration">
                    <i class="far fa-clock"></i>
                    <span>${formatDuration(build.duration)}</span>
                </div>
            ` : ''}
        </div>
        ${build.changeSets?.length > 0 ? `
            <div class="build-changes">
                <div class="changes-header">Changes:</div>
                ${build.changeSets[0].items.map(change => `
                    <div class="change-item">
                        <span class="change-message">${escapeHtml(change.msg || 'No message')}</span>
                        <span class="change-author">${change.author?.fullName || 'Unknown'}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        <div class="build-actions">
            <button class="btn btn-sm btn-outline view-log-btn" data-build-number="${build.number}">
                <i class="fas fa-file-alt"></i> View Log
            </button>
            <button class="btn btn-sm btn-outline rebuild-btn" data-build-number="${build.number}">
                <i class="fas fa-redo"></i> Rebuild
            </button>
        </div>
    `;
    
    return card;
}

/**
 * Show loading state in build list
 */
function showLoadingState(container) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon"><i class="fas fa-spinner fa-spin"></i></div>
            <div class="empty-text">Loading build history...</div>
        </div>
    `;
}

/**
 * Show error state in build list
 */
function showErrorState(container, message) {
    container.innerHTML = `
        <div class="empty-state error">
            <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="empty-text">${escapeHtml(message)}</div>
            <button class="btn btn-sm btn-primary mt-2" id="retry-load-builds">
                <i class="fas fa-sync-alt"></i> Retry
            </button>
        </div>
    `;
    
    // Add retry button handler
    const retryBtn = document.getElementById('retry-load-builds');
    if (retryBtn) {
        retryBtn.addEventListener('click', loadBuilds);
    }
}

/**
 * Show message when no builds are found
 */
function showNoBuildsMessage(container) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon"><i class="fas fa-inbox"></i></div>
            <div class="empty-text">No builds found for this job</div>
            <button class="btn btn-sm btn-primary mt-2" id="trigger-first-build">
                <i class="fas fa-plus"></i> Trigger First Build
            </button>
        </div>
    `;
    
    // Add trigger build button handler
    const triggerBtn = document.getElementById('trigger-first-build');
    if (triggerBtn) {
        triggerBtn.addEventListener('click', triggerBuild);
    }
}

/**
 * Update the last build status badge
 */
function updateLastBuildStatus(status) {
    const statusEl = document.getElementById('status-badge');
    if (!statusEl) return;
    
    statusEl.className = 'status-badge';
    statusEl.innerHTML = '';
    
    const statusInfo = getBuildStatusInfo(status);
    const icon = document.createElement('i');
    icon.className = `fas ${statusInfo.icon}`;
    
    statusEl.classList.add(statusInfo.statusClass);
    statusEl.appendChild(icon);
    statusEl.title = `Last build status: ${status || 'UNKNOWN'}`;
}

/**
 * Get build status information
 */
function getBuildStatusInfo(status) {
    switch (status) {
        case 'SUCCESS':
            return { 
                statusClass: 'success',
                icon: 'fa-check-circle',
                color: '#28a745' 
            };
        case 'FAILURE':
            return { 
                statusClass: 'failure',
                icon: 'fa-times-circle',
                color: '#dc3545' 
            };
        case 'ABORTED':
            return { 
                statusClass: 'aborted',
                icon: 'fa-ban',
                color: '#6c757d' 
            };
        case 'UNSTABLE':
            return { 
                statusClass: 'unstable',
                icon: 'fa-exclamation-triangle',
                color: '#ffc107' 
            };
        case 'IN_PROGRESS':
            return { 
                statusClass: 'in-progress',
                icon: 'fa-spinner fa-spin',
                color: '#17a2b8' 
            };
        default:
            return { 
                statusClass: 'unknown',
                icon: 'fa-question-circle',
                color: '#6c757d' 
            };
    }
}

/**
 * View build log in a modal
 */
async function viewBuildLog(buildNumber) {
    const modal = document.getElementById('log-modal');
    const logContent = document.getElementById('log-content');
    const modalTitle = document.getElementById('log-modal-title');
    
    if (!modal || !logContent || !modalTitle) return;
    
    // Set modal title
    modalTitle.textContent = `Build #${buildNumber} Log`;
    
    // Show loading state
    logContent.innerHTML = '<div class="log-loading"><i class="fas fa-spinner fa-spin"></i> Loading log...</div>';
    
    // Open modal
    openModal('log-modal');
    
    try {
        // Fetch log content
        const response = await fetchWithAuth(
            `${API}/job/${encodeURIComponent(state.jobName)}/${buildNumber}/consoleText`
        );
        const logText = await response.text();
        
        // Format and display log
        logContent.innerHTML = `<pre>${escapeHtml(logText)}</pre>`;
        
        // Auto-scroll to bottom
        logContent.scrollTop = logContent.scrollHeight;
        
    } catch (error) {
        console.error('Failed to load build log:', error);
        logContent.innerHTML = `
            <div class="log-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load build log</p>
            </div>
        `;
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add global error handler
    window.addEventListener('error', (event) => {
        console.error('Unhandled error:', event.error);
        showError('An unexpected error occurred', event.error);
        return true;
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showError('An unexpected error occurred', event.reason);
        event.preventDefault();
    });
    
    // Initialize build history
    initBuildHistory();
});
