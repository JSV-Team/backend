const express = require('express');
const router = express.Router();
const matchService = require('../services/matchService');
const { verifyToken } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(verifyToken);

/**
 * Validation middleware for match history query params
 * Validates 'limit' if provided - must be a positive integer
 */
const validateHistoryQuery = (req, res, next) => {
    const { limit } = req.query;
    
    if (limit !== undefined) {
        // Check if it contains SQL injection patterns
        const sqlInjectionPatterns = [
            /;\s*(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE)/i,
            /\s+OR\s+/i,
            /\s+UNION\s+/i,
            /--/,
            /\/\*/,
            /\*\//
        ];
        
        for (const pattern of sqlInjectionPatterns) {
            if (pattern.test(limit)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tham số limit phải là số nguyên',
                    error: 'limit must be an integer'
                });
            }
        }
        
        const parsedLimit = parseInt(limit, 10);
        
        if (isNaN(parsedLimit)) {
            return res.status(400).json({
                success: false,
                message: 'Tham số limit phải là số nguyên',
                error: 'limit must be an integer'
            });
        }
        
        if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Tham số limit phải là số nguyên dương',
                error: 'limit must be a positive integer'
            });
        }
        
        // Check for decimal values
        if (limit.includes('.')) {
            return res.status(400).json({
                success: false,
                message: 'Tham số limit phải là số nguyên',
                error: 'limit must be an integer'
            });
        }
        
        // Convert to number for use in handler
        req.query.limit = parsedLimit;
    }
    
    next();
};

/**
 * POST /api/match/join
 * Tham gia hàng đợi ghép đôi
 * Body: { interests?: number[] } - optional list of interest IDs to filter by
 */
router.post('/join', async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // TODO: Add user to queue via Socket.IO
        // For now, return a success response indicating the queue join was initiated
        // The actual matching will be handled by the socket handler
        
        res.status(200).json({
            success: true,
            message: 'Đã tham gia hàng đợi ghép đôi',
            data: {
                userId,
                status: 'searching',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error joining match queue:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tham gia hàng đợi',
            error: error.message
        });
    }
});

/**
 * POST /api/match/cancel
 * Hủy tìm kiếm ghép đôi
 */
router.post('/cancel', async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // TODO: Remove user from queue via Socket.IO
        // For now, return a success response
        
        res.status(200).json({
            success: true,
            message: 'Đã hủy tìm kiếm ghép đôi',
            data: {
                userId,
                status: 'cancelled',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error cancelling match search:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy tìm kiếm',
            error: error.message
        });
    }
});

/**
 * GET /api/match/history
 * Lấy lịch sử ghép đôi
 * Query params: limit (default: 20)
 */
router.get('/history', validateHistoryQuery, async (req, res) => {
    try {
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit) || 20;
        
        const history = await matchService.getMatchHistory(userId, limit);
        
        res.status(200).json({
            success: true,
            message: 'Lấy lịch sử ghép đôi thành công',
            data: history
        });
    } catch (error) {
        console.error('Error getting match history:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử ghép đôi',
            error: error.message
        });
    }
});

module.exports = router;