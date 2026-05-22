import { initSocket, getSocket } from './socket.js';

// Initialize socket connection when the app loads
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Get user data from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Only initialize socket if user is logged in and has a role
        if (user && user.role) {
            console.log('Initializing socket connection for role:', user.role);
            initSocket(user.role);
            
            // Listen for user count updates
            const socket = getSocket();
            if (socket) {
                socket.on('userCountUpdate', (data) => {
                    console.log('User count update:', data);
                    // You can update the UI here with the new user counts if needed
                    // For example, update a counter in the admin dashboard
                    updateUserCountUI(data);
                });
            }
        }
    } catch (error) {
        console.error('Error initializing socket:', error);
    }
});

// Function to update the UI with user counts
function updateUserCountUI(counts) {
    // This function will be called when user count updates are received
    // You can implement the UI update logic here
    console.log('Updating user counts:', counts);
    
    // Example: Update a counter element in the admin dashboard
    const counterElement = document.getElementById('user-count-display');
    if (counterElement) {
        counterElement.textContent = `Total Online: ${counts.total || 0}`;
    }
    
    // Update role-specific counters if they exist
    Object.entries(counts).forEach(([role, count]) => {
        const roleCounter = document.getElementById(`${role}-count`);
        if (roleCounter) {
            roleCounter.textContent = count;
        }
    });
}

// Handle page unload
document.addEventListener('beforeunload', () => {
    const socket = getSocket();
    if (socket) {
        console.log('Disconnecting socket...');
        socket.disconnect();
    }
});

// Export for testing or other modules if needed
export { updateUserCountUI };
