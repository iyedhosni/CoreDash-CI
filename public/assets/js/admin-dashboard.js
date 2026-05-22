// Import socket utilities
import { initSocket, disconnectSocket, isConnected, reconnectSocket } from './socket.js';

// Role icons mapping
const roleIcons = {
    admin: 'bx bxs-shield',
    professional_devops: 'bx bxs-cog',
    professional_developer: 'bx bxs-code-alt',
    professional_tester: 'bx bxs-bug',
    professional_architect: 'bx bxs-layer',
    client: 'bx bxs-user',
    default: 'bx bxs-user-circle'
};

// Role display names
const roleDisplayNames = {
    admin: 'Administrator',
    professional_devops: 'DevOps',
    professional_developer: 'Developer',
    professional_tester: 'Tester',
    professional_architect: 'Architect',
    client: 'Client'
};

// Format role key to display name
function formatRoleName(role) {
    return roleDisplayNames[role] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

let realtimeRoleChartInstance = null; // Variable to hold the chart instance

// Function to initialize or update the real-time role bar chart
// Now accepts data in format: { admin: 1, developpeur: 2, ... }
function initializeOrUpdateRealtimeRoleChart(roleCountObject) {
    const ctx = document.getElementById('realtimeRoleChart')?.getContext('2d');
    if (!ctx) {
        console.error('realtimeRoleChart canvas not found.');
        return;
    }

    // Transform object to array format for Chart.js
    const roleDataArray = Object.entries(roleCountObject).map(([role, count]) => ({
        role: role,
        count: count
    }));

    const labels = roleDataArray.map(item => formatRoleName(item.role));
    const data = roleDataArray.map(item => item.count);

    // Define a color palette (can be expanded or made more dynamic)
    const backgroundColors = [
        'rgba(78, 115, 223, 0.7)',  // Primary
        'rgba(28, 200, 138, 0.7)',  // Success
        'rgba(54, 185, 204, 0.7)',  // Info
        'rgba(246, 194, 62, 0.7)',   // Warning
        'rgba(231, 74, 59, 0.7)',   // Danger
        'rgba(108, 117, 125, 0.7)' // Secondary
    ];
    const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));

    if (realtimeRoleChartInstance) {
        // Update existing chart
        realtimeRoleChartInstance.data.labels = labels;
        realtimeRoleChartInstance.data.datasets[0].data = data;
        realtimeRoleChartInstance.data.datasets[0].backgroundColor = backgroundColors.slice(0, data.length);
        realtimeRoleChartInstance.data.datasets[0].borderColor = borderColors.slice(0, data.length);
        realtimeRoleChartInstance.update();
    } else {
        // Create new chart
        realtimeRoleChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'User Count',
                    data: data,
                    backgroundColor: backgroundColors.slice(0, data.length),
                    borderColor: borderColors.slice(0, data.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // For horizontal bar chart, if preferred
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1 // Ensure integer ticks for user counts
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Hiding legend as it's a single dataset
                    },
                    title: {
                        display: true,
                        text: 'Real-time User Role Distribution'
                    }
                }
            }
        });
    }
}

// Update the UI with new user counts
function updateUserCounts(counts) {
    const container = document.getElementById('rolesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!counts || Object.keys(counts).length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-warning">
                    No active users at the moment.
                </div>
            </div>`;
        return;
    }

    // Calculate total users
    const totalUsers = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    // Add total users card
    const totalCard = document.createElement('div');
    totalCard.className = 'col-xl-3 col-md-6 mb-4';
    totalCard.innerHTML = `
        <div class="card border-left-primary shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                            Total Online Users
                        </div>
                        <div class="h5 mb-0 font-weight-bold text-gray-800 count">
                            ${totalUsers} ${totalUsers === 1 ? 'User' : 'Users'}
                        </div>
                    </div>
                    <div class="col-auto">
                        <i class="bx bx-group role-icon"></i>
                    </div>
                </div>
            </div>
        </div>`;
    container.appendChild(totalCard);

    // Add role cards
    for (const [role, count] of Object.entries(counts)) {
        if (role === 'total') continue; // Skip total as we calculate it above
        
        const icon = roleIcons[role] || roleIcons.default;
        const displayName = formatRoleName(role);
        
        const roleCard = document.createElement('div');
        roleCard.className = 'col-xl-3 col-md-6 mb-4';
        roleCard.innerHTML = `
            <div class="card border-left-success shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                ${displayName}
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800 count">
                                ${count} ${count === 1 ? 'User' : 'Users'}
                            </div>
                        </div>
                        <div class="col-auto">
                            <i class="${icon} role-icon"></i>
                        </div>
                    </div>
                </div>
            </div>`;
        
        container.appendChild(roleCard);
    }
    
    // Update last updated time
    const now = new Date();
    document.getElementById('lastUpdated').textContent = now.toLocaleString();
}

// Fetch and update total users count and percentage change
async function updateTotalUsers() {
    try {
        const response = await fetch(`${window.ENV.BACKEND_URL}/api/users/count`, {
            credentials: 'include'  // Include cookies for authenticated requests if needed
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch user count');
        }
        
        const data = await response.json();
        const totalUsersElement = document.getElementById('totalUsersCount');
        const percentageChangeElement = document.getElementById('userPercentageChange');
        
        if (totalUsersElement) {
            totalUsersElement.textContent = data.totalUsers || '0';
        }
        
        if (percentageChangeElement) {
            const percentage = data.percentageChange || 0;
            const isPositive = percentage > 0;
            const isNegative = percentage < 0;
            const isNeutral = percentage === 0;
            
            let icon = 'bx-minus';
            if (isPositive) icon = 'bx-up-arrow-alt';
            if (isNegative) icon = 'bx-down-arrow-alt';
            
            // Update the percentage change display
            percentageChangeElement.className = `stat-change ${isPositive ? 'positive' : isNegative ? 'negative' : ''}`;
            percentageChangeElement.innerHTML = `
                <i class='bx ${icon}'></i> 
                ${Math.abs(percentage)}% from last week
            `;
        }
    } catch (error) {
        console.error('Error fetching user count:', error);
        const totalUsersElement = document.getElementById('totalUsersCount');
        if (totalUsersElement) {
            totalUsersElement.textContent = 'Error';
        }
    }
}

// Initialize the admin dashboard
async function initAdminDashboard() {
    let socket = null; // Declare socket here

    // Fetch and update total users count
    await updateTotalUsers();

    // Initial data for the real-time role chart will now come from 'initialCounts' socket event
    // So, we remove the fetch call here for this specific chart.

    // Update user count every 5 minutes (300000ms)
    setInterval(updateTotalUsers, 300000);
    // Show loading state
    const container = document.getElementById('rolesContainer');
    if (container) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-info">
                    <div class="spinner-border spinner-border-sm" role="status"></div>
                    <span class="ms-2">Connecting to server...</span>
                </div>
            </div>`;
    }
    
    try {
        // Initialize socket connection for admin role
        socket = initSocket('admin'); // Assign to the outer scope socket
        
        if (!socket) {
            throw new Error('Failed to initialize socket connection');
        }
        
        // Log socket connection status
        console.log('Socket connection status:', {
            connected: socket.connected,
            id: socket.id,
            transport: socket.io.engine?.transport?.name
        });
        
        // Set up socket event listeners
        setupSocketListeners(socket); // Pass the initialized socket
        
    } catch (error) {
        console.error('Error initializing socket:', error);
        updateConnectionStatus(`Connection error: ${error.message}`, 'danger');
    }
    
    // The following event listeners are now handled by setupSocketListeners
    // Remove them from here to avoid duplication and scope issues.
}

// Update connection status in the UI
function updateConnectionStatus(message, type = 'info') {
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        const now = new Date();
        lastUpdated.innerHTML = `${message} <span class="text-${type}">(${now.toLocaleTimeString()})</span>`;
    }
}

// Update the last updated timestamp
function updateLastUpdated() {
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = new Date().toLocaleTimeString();
    }
}

// Set up socket event listeners
function setupSocketListeners(socket) {
    // Request initial counts once connected
    const onConnectHandler = () => { // Renamed to avoid conflict if any
        console.log('Connected to WebSocket server (via setupSocketListeners)');
        socket.emit('getInitialCounts'); // This will trigger 'initialCounts' listener below
        updateConnectionStatus('Connected to server', 'success');
    };
    
    // If already connected, request counts immediately
    if (socket.connected) {
        onConnectHandler();
    } else {
        // Otherwise, wait for the connection
        socket.on('connect', onConnectHandler);
    }
    
    // Listen for user count updates (for the real-time bar chart)
    socket.on('userCountUpdate', (counts) => {
        console.log('Received userCountUpdate for chart (via setupSocketListeners):', counts);
        initializeOrUpdateRealtimeRoleChart(counts);
    });

    // Handle initial counts (for the real-time bar chart)
    socket.on('initialCounts', (counts) => {
        console.log('Received initialCounts for chart (via setupSocketListeners):', counts);
        initializeOrUpdateRealtimeRoleChart(counts);
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
        console.log('Disconnected from WebSocket server:', reason);
        updateConnectionStatus('Disconnected from server. Reconnecting...', 'warning');
    });
    
    // Handle connection errors
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateConnectionStatus('Connection error. Attempting to reconnect...', 'danger');
    });
    
    // Handle reconnection
    socket.on('reconnect', (attemptNumber) => {
        console.log(`Reconnected to WebSocket server after ${attemptNumber} attempts`);
        updateConnectionStatus('Reconnected to server', 'success');
        // Request updated counts after reconnection
        socket.emit('getInitialCounts');
    });

    socket.on('roleDistributionUpdated', (newRoleData) => {
        console.log('Received roleDistributionUpdated (via setupSocketListeners):', newRoleData);
        // This is for the pie chart (total DB users), not the active user bar chart.
        // If you have a pie chart that uses this, ensure its update function is called here.
        // For example: updatePieChartWithRoleDistribution(newRoleData);
    });

    socket.on('authentication_success', (data) => {
        console.log('Received authentication_success (via setupSocketListeners):', data);
    });
}

// Track if we're already initializing
let isInitializing = false;

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add beforeunload handler to clean up
    window.addEventListener('beforeunload', cleanupBeforeUnload);
    
    // Initialize the dashboard
    if (!isInitializing) {
        isInitializing = true;
        initAdminDashboard().finally(() => {
            isInitializing = false;
        });
    }
});

// Clean up before page unload
function cleanupBeforeUnload() {
    console.log('Cleaning up before page unload...');
    window.removeEventListener('beforeunload', cleanupBeforeUnload);
    
    // Disconnect socket
    if (window.socket) {
        console.log('Disconnecting socket...');
        window.socket.disconnect();
        window.socket = null;
    }
}

// Export for testing if needed
export { updateUserCounts, initAdminDashboard };
