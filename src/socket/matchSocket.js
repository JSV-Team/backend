/**
 * Match Socket.IO Handler
 * Sets up Socket.IO event handlers for the interest-based matching system
 */

const onlineUsers = new Map();
const queueService = require('../services/queueService');

/**
 * Sets up Socket.IO handlers for match functionality
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Socket instance
 */
function setupMatchSocket(io, socket) {
    console.log(`🎮 Setting up match handlers for user: ${socket.userId}`);
    
    // Store user connection
    if (socket.userId) {
        onlineUsers.set(socket.userId, socket.id);
    }

    // Handle match:join event
    socket.on('match:join', async (data, callback) => {
            console.log('📨 Received match:join event from socket:', socket.id, 'userId:', socket.userId);
            
            const userId = socket.userId;
            
            if (!userId) {
                const errorResponse = {
                    success: false,
                    error: 'Người dùng chưa xác thực',
                    errorCode: 'UNAUTHORIZED'
                };
                
                if (typeof callback === 'function') {
                    callback(errorResponse);
                } else {
                    socket.emit('match:joined', errorResponse);
                }
                return;
            }

            try {
                // Add user to queue via queueService
                const result = await queueService.joinQueue(userId, {
                    socketId: socket.id
                });

                if (result.success) {
                    const response = {
                        success: true,
                        queueSize: result.data.queueSize,
                        estimatedWaitTime: result.data.estimatedWaitTime,
                        message: result.data.message
                    };

                    if (typeof callback === 'function') {
                        callback(response);
                    } else {
                        socket.emit('match:joined', response);
                    }
                    
                    console.log(`✅ User ${userId} joined queue. Queue size: ${result.data.queueSize}`);
                } else {
                    const errorResponse = {
                        success: false,
                        error: result.error,
                        errorCode: result.errorCode
                    };

                    if (typeof callback === 'function') {
                        callback(errorResponse);
                    } else {
                        socket.emit('match:joined', errorResponse);
                    }
                    
                    console.log(`❌ User ${userId} failed to join queue: ${result.error}`);
                }
            } catch (error) {
                console.error(`⚠️ Error in match:join for user ${userId}:`, error.message);
                
                const errorResponse = {
                    success: false,
                    error: 'Lỗi hệ thống',
                    errorCode: 'SYSTEM_ERROR'
                };
                
                if (typeof callback === 'function') {
                    callback(errorResponse);
                } else {
                    socket.emit('match:joined', errorResponse);
                }
            }
        });

        // Handle match:ping event (heartbeat)
        socket.on('match:ping', (data, callback) => {
            const userId = socket.userId;
            
            if (!userId) {
                const errorResponse = {
                    success: false,
                    error: 'Người dùng chưa xác thực',
                    errorCode: 'UNAUTHORIZED'
                };
                
                if (typeof callback === 'function') {
                    callback(errorResponse);
                } else {
                    socket.emit('match:pong', errorResponse);
                }
                return;
            }

            try {
                // Reset user timeout to keep connection alive
                const resetResult = queueService.resetUserTimeout(userId);
                
                const response = {
                    success: resetResult,
                    timestamp: Date.now()
                };

                if (typeof callback === 'function') {
                    callback(response);
                } else {
                    socket.emit('match:pong', response);
                }
                
                console.log(`💓 Heartbeat received from user ${userId}, timeout reset: ${resetResult}`);
            } catch (error) {
                console.error(`⚠️ Error in match:ping for user ${userId}:`, error.message);
                
                const errorResponse = {
                    success: false,
                    error: 'Lỗi hệ thống',
                    errorCode: 'SYSTEM_ERROR'
                };
                
                if (typeof callback === 'function') {
                    callback(errorResponse);
                } else {
                    socket.emit('match:pong', errorResponse);
                }
            }
        });

        // Handle match:cancel event
        socket.on('match:cancel', async (data, callback) => {
            const userId = socket.userId;
            
            if (!userId) {
                const errorResponse = {
                    success: false,
                    error: 'Người dùng chưa xác thực',
                    errorCode: 'UNAUTHORIZED'
                };
                
                if (typeof callback === 'function') {
                    callback(errorResponse);
                } else {
                    socket.emit('match:cancelled', errorResponse);
                }
                return;
            }

            try {
                // Check if user is in queue
                if (!queueService.isUserInQueue(userId)) {
                    const errorResponse = {
                        success: false,
                        error: 'Bạn không có trong hàng đợi',
                        errorCode: 'NOT_IN_QUEUE'
                    };

                    if (typeof callback === 'function') {
                        callback(errorResponse);
                    } else {
                        socket.emit('match:cancelled', errorResponse);
                    }
                    return;
                }

                // Remove user from queue via queueService
                const result = queueService.cancelQueue(userId);

                if (result.success) {
                    const response = {
                        success: true,
                        message: result.message || 'Đã hủy tìm kiếm'
                    };

                    if (typeof callback === 'function') {
                        callback(response);
                    } else {
                        socket.emit('match:cancelled', response);
                    }
                    
                    console.log(`✅ User ${userId} cancelled queue participation`);
                } else {
                    const errorResponse = {
                        success: false,
                        error: result.error,
                        errorCode: result.errorCode
                    };

                    if (typeof callback === 'function') {
                        callback(errorResponse);
                    } else {
                        socket.emit('match:cancelled', errorResponse);
                    }
                    
                    console.log(`❌ User ${userId} failed to cancel queue: ${result.error}`);
                }
            } catch (error) {
                console.error(`⚠️ Error in match:cancel for user ${userId}:`, error.message);
                
                const errorResponse = {
                    success: false,
                    error: 'Lỗi hệ thống',
                    errorCode: 'SYSTEM_ERROR'
                };
                
                if (typeof callback === 'function') {
                    callback(errorResponse);
                } else {
                    socket.emit('match:cancelled', errorResponse);
                }
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${socket.userId}`);
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
            }
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error(`⚠️ Socket error for user ${socket.userId}:`, error.message);
        });
}

module.exports = { setupMatchSocket };