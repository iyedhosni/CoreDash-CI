const socketIO = require('socket.io');

// Store active users by role and individual user connections
const roleCounts = new Map(); // role -> count
const userConnections = new Map(); // userId -> { socketIds: Set, role: string, lastSeen: Date, userData: any }

/**
 * Clean up inactive connections (older than 5 minutes)
 * @param {Object} io - Socket.IO server instance
 */
const cleanupInactiveConnections = (io) => {
    try {
        const now = new Date();
        const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        for (const [userId, userData] of userConnections.entries()) {
            // Skip if no lastSeen
            if (!userData.lastSeen) {
                userData.lastSeen = new Date();
                continue;
            }
            
            // Clean up if inactive
            if (now - userData.lastSeen > FIVE_MINUTES) {
                console.log(`Cleaning up inactive user: ${userId}`);
                
                // Clean up any remaining socket connections
                if (userData.socketIds) {
                    for (const socketId of userData.socketIds) {
                        const socket = io.sockets.sockets.get(socketId);
                        if (socket) {
                            socket.disconnect(true);
                        }
                    }
                }
                
                // Remove user and update role count
                if (userData.role) {
                    updateRoleCount(io, userData.role, -1);
                }
                userConnections.delete(userId);
            }
        }
    } catch (error) {
        console.error('Error in cleanupInactiveConnections:', error);
    }
};

/**
 * Update role counts and broadcast changes
 * @param {Object} io - Socket.IO server instance
 * @param {string} role - User role to update
 * @param {number} delta - Change in count (1 or -1)
 * @returns {number} New count for the role
 */
const updateRoleCount = (io, role, delta) => {
    try {
        if (!role) return 0;
        
        const currentCount = roleCounts.get(role) || 0;
        const newCount = Math.max(0, currentCount + delta);
        
        if (newCount > 0) {
            roleCounts.set(role, newCount);
        } else {
            roleCounts.delete(role);
        }
        
        // Broadcast the updated counts to all clients
        const counts = getCurrentCounts();
        if (io) {
            io.emit('userCountUpdate', counts);
        }
        
        console.log(`Role ${role} count updated: ${newCount}`, { currentCounts: counts });
        return newCount;
    } catch (error) {
        console.error('Error updating role count:', error);
        return 0;
    }
};

/**
 * Get current role counts as a plain object
 * @returns {Object} Role counts
 */
const getCurrentCounts = () => {
    return Object.fromEntries(roleCounts);
};

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Configured Socket.IO instance
 */
const initializeSocket = (server) => {
    const io = socketIO(server, {
        cors: {
            origin: [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://localhost:5500',
                'http://127.0.0.1:5500'
            ],
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            credentials: true
        },
        pingTimeout: 60000, // 60 seconds
        pingInterval: 25000,  // 25 seconds
        transports: ['websocket', 'polling']
    });

    // Run cleanup every minute
    const cleanupInterval = setInterval(() => cleanupInactiveConnections(io), 60000);

    // Clean up on server shutdown
    const cleanup = () => {
        clearInterval(cleanupInterval);
    };
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);

    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        // Send current counts to newly connected client
        socket.emit('initialCounts', getCurrentCounts());

        // Handle authentication
        socket.on('authenticate', ({ userId: uid, role, userData: userAuthData }) => {
            try {
                if (!uid) {
                    console.error('Missing userId in authentication');
                    return;
                }
                
                if (!role) {
                    console.warn('No role provided, defaulting to guest');
                    role = 'guest';
                }
                
                console.log('Authenticating user:', { 
                    userId: uid, 
                    role, 
                    socketId: socket.id,
                    hasUserData: !!userAuthData
                });
                
                // Store user data on socket
                socket.userId = uid;
                socket.role = role;
                socket.authenticated = true;
                
                // Initialize user data if not exists
                if (!userConnections.has(uid)) {
                    userConnections.set(uid, {
                        socketIds: new Set(),
                        role: role,
                        lastSeen: new Date(),
                        userData: userAuthData || {}
                    });
                    
                    // Update role count for new user
                    updateRoleCount(io, role, 1);
                    console.log(`New user connected: ${uid} (${role}) - Total ${role}s: ${roleCounts.get(role) || 0}`);
                }
                
                // Add this socket to user's connections
                const userData = userConnections.get(uid);
                userData.socketIds.add(socket.id);
                userData.lastSeen = new Date();
                
                // If user data was provided, update it
                if (userAuthData) {
                    userData.userData = { ...(userData.userData || {}), ...userAuthData };
                }
                
                // Send success confirmation to the client
                socket.emit('authentication_success', {
                    userId: uid,
                    role: role,
                    activeConnections: userData.socketIds.size,
                    roleCounts: getCurrentCounts()
                });
                
                console.log('Authentication successful:', {
                    userId: uid,
                    role,
                    activeConnections: userData.socketIds.size,
                    roleCounts: getCurrentCounts()
                });
                
            } catch (error) {
                console.error('Error during authentication:', error);
                socket.emit('authentication_error', {
                    message: 'Authentication failed',
                    error: error.message
                });
            }
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            try {
                const logData = {
                    socketId: socket.id,
                    userId: socket.userId || 'unknown',
                    reason: reason || 'unknown reason',
                    wasConnected: socket.connected,
                    authenticated: socket.authenticated || false
                };
                
                console.log('Client disconnected:', logData);
                
                // Only clean up if we have a valid user ID and socket is authenticated
                if (socket.userId && socket.authenticated && userConnections.has(socket.userId)) {
                    const userData = userConnections.get(socket.userId);
                    
                    // Verify user data exists and has socketIds Set
                    if (userData?.socketIds?.has(socket.id)) {
                        // Remove this socket from user's connections
                        userData.socketIds.delete(socket.id);
                        userData.lastSeen = new Date();
                        
                        // If user has no more connections, remove them
                        if (userData.socketIds.size === 0) {
                            const role = userData.role || 'unknown';
                            userConnections.delete(socket.userId);
                            
                            // Update role count
                            updateRoleCount(io, role, -1);
                            
                            console.log(`User ${socket.userId} (${role}) fully disconnected`);
                        } else {
                            console.log(`User ${socket.userId} has ${userData.socketIds.size} remaining connections`);
                        }
                    } else {
                        console.warn('Invalid user data structure for user:', socket.userId);
                    }
                } else if (socket.role) {
                    // Fallback for unauthenticated connections with role
                    updateRoleCount(io, socket.role, -1);
                }
            } catch (error) {
                console.error('Error during disconnection handling:', error);
            }
        });

        // Handle request for current counts
        socket.on('getCounts', () => {
            socket.emit('initialCounts', getCurrentCounts());
        });

        // Handle joining rooms (user or role based)
        socket.on('join', ({ userId, room, role }) => {
            try {
                if (room) {
                    // Join a specific room
                    socket.join(room);
                    console.log(`Socket ${socket.id} joined room: ${room}`);
                } else if (role) {
                    // Join role-based room
                    socket.join(role);
                    console.log(`Socket ${socket.id} joined role room: ${role}`);
                    
                    // Update user's role if it's different
                    if (socket.role !== role) {
                        console.log(`Updating socket ${socket.id} role from ${socket.role} to ${role}`);
                        socket.role = role;
                    }
                } else if (userId) {
                    // Join user-specific room
                    const userRoom = `user_${userId}`;
                    socket.join(userRoom);
                    console.log(`Socket ${socket.id} joined user room: ${userRoom}`);
                } else {
                    console.warn('Socket join called without room, role, or userId');
                }
            } catch (error) {
                console.error('Error joining room:', error);
            }
        });

        // Handle leaving a room
        socket.on('leave', ({ room }) => {
            if (room) {
                socket.leave(room);
                console.log(`Socket ${socket.id} left room: ${room}`);
            }
        });

        // Handle notification subscription
        socket.on('subscribe', ({ channels = [] }) => {
            try {
                channels.forEach(channel => {
                    if (typeof channel === 'string' && channel.trim() !== '') {
                        socket.join(channel);
                        console.log(`Socket ${socket.id} subscribed to channel: ${channel}`);
                    }
                });
            } catch (error) {
                console.error('Error subscribing to channels:', error);
            }
        });

        // Handle notification unsubscription
        socket.on('unsubscribe', ({ channels = [] }) => {
            try {
                channels.forEach(channel => {
                    if (typeof channel === 'string' && channel.trim() !== '') {
                        socket.leave(channel);
                        console.log(`Socket ${socket.id} unsubscribed from channel: ${channel}`);
                    }
                });
            } catch (error) {
                console.error('Error unsubscribing from channels:', error);
            }
        });
    });

    // Helper function to send notifications
    const sendNotification = (target, notification) => {
        try {
            if (!notification || typeof notification !== 'object') {
                console.error('Invalid notification format:', notification);
                return;
            }

            // Add timestamp if not present
            if (!notification.timestamp) {
                notification.timestamp = new Date().toISOString();
            }

            // Add notification ID if not present
            if (!notification.id) {
                notification.id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            console.log('Sending notification:', {
                target,
                notificationId: notification.id,
                type: notification.type,
                timestamp: notification.timestamp
            });

            // Emit notification to the target (can be a room or socket ID)
            io.to(target).emit('new_notification', notification);
            
            // Also emit to the legacy event for backward compatibility
            io.to(target).emit('notification', notification);
            
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    };

    // Make the sendNotification function available on the io instance
    io.sendNotification = sendNotification;

    // Clean up on server shutdown
    process.on('SIGTERM', () => {
        console.log('Closing Socket.IO server...');
        io.close();
    });

    return io;
};

module.exports = { initializeSocket };
