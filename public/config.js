// Frontend configuration
window.ENV = {
    // Backend API URL - update this to match your backend server URL
    BACKEND_URL: 'http://localhost:3000',
    
    // Socket.IO configuration
    SOCKET_PATH: '/socket.io',
    
    // Debug mode - set to false in production
    DEBUG: true
};

// Log the current environment configuration
if (window.ENV.DEBUG) {
    console.log('Frontend environment configuration:', window.ENV);
}
