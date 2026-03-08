const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile-update.controller');

// Middleware giả lập auth - trong thực tế cần thay thế bằng middleware auth thực
const authMiddleware = (req, res, next) => {
    const userId = req.headers['x-auth-user-id'] || req.query.userId;
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Vui lòng đăng nhập để tiếp tục"
        });
    }
    
    req.user = { user_id: parseInt(userId) };
    next();
};

// @route   GET /api/profile
// @desc    Lấy thông tin profile của user hiện tại
// @access  Private
router.get('/', authMiddleware, profileController.getProfile);

// @route   PUT /api/profile
// @desc    Cập nhật thông tin profile
// @access  Private
router.put('/', authMiddleware, profileController.updateProfile);

// @route   PUT /api/profile/password
// @desc    Đổi mật khẩu
// @access  Private
router.put('/password', authMiddleware, profileController.changePassword);

// @route   PUT /api/profile/interests
// @desc    Cập nhật sở thích
// @access  Private
router.put('/interests', authMiddleware, profileController.updateInterests);

// @route   GET /api/profile/:userId
// @desc    Lấy thông tin public profile của user khác
// @access  Public
router.get('/:userId', profileController.getPublicProfile);

module.exports = router;

