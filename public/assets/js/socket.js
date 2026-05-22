// Import Socket.IO client
import { io } from 'https://cdn.socket.io/4.7.2/socket.io.esm.min.js';

// Socket.IO connection manager
let socket = null;
let userId = null;
let userRole = null;

// Get backend URL from environment configuration or use default
const getBackendUrl = () => {
    // Check if we're running in a browser environment
    if (typeof window !== 'undefined' && window.ENV?.BACKEND_URL) {
        return window.ENV.BACKEND_URL;
    }
    // Default to localhost if no configuration is found
    return 'http://localhost:3000';
};

// Convert HTTP URL to WebSocket URL
const getWebSocketUrl = (url) => {
    if (!url) return 'ws://localhost:3000';
    return url.replace(/^http/, 'ws');
};

console.log('Initializing socket connection...');

// Initialize Socket.IO connection and authenticate user
export function initSocket(role) {
    // Use the provided server URL or get it from the environment
    const serverUrl = getBackendUrl();
    const socketUrl = getWebSocketUrl(serverUrl);
    
    console.log(`Initializing socket connection to: ${socketUrl}`);
    
    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || `guest-${Math.random().toString(36).substr(2, 9)}`;
    const userRole = role || 'guest';
    
    // If we already have a socket connection, clean it up first
    if (socket) {
        console.log('Cleaning up existing socket connection...');
        socket.off(); // Remove all event listeners
        socket.disconnect();
    }
    
    // Create new socket connection
    socket = io(socketUrl, {
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        transports: ['websocket', 'polling']
    });
    
    // Store user info on the socket
    socket.userId = userId;
    socket.role = userRole;
    
    // Set up event listeners
    setupSocketListeners();
    
    // When connected, authenticate
    const onConnect = () => {
        console.log('Socket connected, authenticating...', { userId, role: userRole });
        socket.emit('authenticate', { 
            userId: userId,
            role: userRole 
        });
    };
    
    // Handle connection events
    socket.on('connect', onConnect);
    
    // If already connected, authenticate immediately
    if (socket.connected) {
        onConnect();
    }
    
    return socket;
}

// Set up socket event listeners
function setupSocketListeners() {
    if (!socket) return;
    
    socket.on('connect', () => {
        console.log('Connected to Socket.IO server', {
            socketId: socket.id,
            userId: socket.userId,
            transport: socket.io.engine?.transport?.name
        });
        
        // Join user-specific room for targeted notifications
        if (socket.userId) {
            socket.emit('join', { userId: socket.userId });
        }
    });
    
    socket.on('disconnect', (reason) => {
        // Safely log disconnection with null checks
        const logData = {
            socketId: socket?.id || 'unknown',
            userId: socket?.userId || 'unknown',
            reason: reason || 'unknown reason',
            wasConnected: socket?.connected || false,
            transport: socket?.io?.engine?.transport?.name || 'unknown'
        };
        
        console.log('Disconnected from Socket.IO server:', logData);
        
        // Clean up event listeners to prevent memory leaks
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            if (socket) {
                socket.off();
            }
        }
    });
    
    socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', {
            error: error.message,
            socketId: socket?.id,
            userId: socket?.userId
        });
    });
    
    // Handle reconnection attempts
    socket.io.on('reconnect_attempt', (attempt) => {
        console.log(`Reconnection attempt ${attempt}...`);
        // Re-authenticate after reconnection
        if (socket.userId && socket.role) {
            socket.emit('authenticate', { 
                userId: socket.userId,
                role: socket.role 
            });
        }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Attempting to reconnect (${attemptNumber})...`);
    });

    // Notification event listeners
    socket.on('new_notification', (notification) => {
        console.log('Received new notification:', notification);
        // Dispatch a custom event that other parts of the app can listen to
        const event = new CustomEvent('notification-received', { detail: notification });
        window.dispatchEvent(event);
        
        // Show a toast notification if available
        if (window.showToast) {
            window.showToast({
                title: notification.title || 'New Notification',
                message: notification.message,
                type: notification.type || 'info'
            });
        }
    });

    socket.on('notification', (data) => {
        console.log('Received notification (legacy format):', data);
        // Handle the legacy notification format if needed
        const event = new CustomEvent('notification-received', { detail: data });
        window.dispatchEvent(event);
    });

    // NEW: Listen for specific user update events
    socket.on('user_updated', (data) => {
      console.log('Received user_updated notification:', data);
      const notification = {
        title: data.title || 'User Updated',
        message: data.message || `User ${data.userId || ''} has been updated.`,
        type: data.type || 'info',
        details: data // Include original data for more context if needed
      };
      const event = new CustomEvent('notification-received', { detail: notification });
      window.dispatchEvent(event);
      if (window.showToast) {
        window.showToast(notification);
      }
    });

    // NEW: Listen for specific user delete events
    socket.on('user_deleted', (data) => {
      console.log('Received user_deleted notification:', data);
      const notification = {
        title: data.title || 'User Deleted',
        message: data.message || `User ${data.userId || ''} has been deleted.`,
        type: data.type || 'warning', // Or 'info'
        details: data
      };
      const event = new CustomEvent('notification-received', { detail: notification });
      window.dispatchEvent(event);
      if (window.showToast) {
        window.showToast(notification);
      }
    });

    // Handle authentication success
    socket.on('authentication_success', (data) => {
        console.log('Authentication successful:', data);
        // Join user-specific room
        if (data.userId) {
            socket.emit('join', { userId: data.userId });
        }
    });

    return socket;
}

// Get the socket instance
export function getSocket() {
    if (!socket) {
        console.warn('Socket not initialized. Call initSocket() first.');
    }
    return socket;
}

// Update user role
// This can be used when the user's role changes during the session
export function updateUserRole(newRole) {
    if (!socket) {
        console.warn('Socket not initialized. Call initSocket() first.');
        return;
    }
    
    if (userRole !== newRole) {
        userRole = newRole;
        socket.emit('updateRole', { role: newRole });
        console.log(`Updated user role to: ${newRole}`);
    }
}

// Disconnect socket
export function disconnectSocket() {
    if (socket) {
        console.log('Disconnecting socket...');
        socket.disconnect();
        socket = null;
        userId = null;
        userRole = null;
    }
}

// Check if socket is connected
export function isConnected() {
    return socket && socket.connected;
}

// Reconnect socket
export function reconnectSocket() {
    if (socket) {
        socket.connect();
    } else if (userRole) {
        // Reinitialize with last known role
        initSocket(userRole);
    }
}
