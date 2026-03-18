const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');

// Middleware giả lập auth - trong thực tế cần thay thế bằng middleware auth thực
// Lấy user_id từ header hoặc query (demo purpose)
const authMiddleware = (req, res, next) => {
    // Trong production, đây sẽ là JWT verification middleware
    // Hiện tại lấy user_id từ header x-auth-user-id
    const userId = req.headers['x-auth-user-id'] || req.query.userId;
    console.log(`>>> [PROFILE AUTH] Header ID: ${userId}`);
    if (!userId) {
        console.log("!!! [PROFILE AUTH] MISSING ID");
        return res.status(401).json({
            success: false,
            message: "Vui lòng đăng nhập để tiếp tục"
        });
    }
    
    req.user = { user_id: parseInt(userId) };
    next();
};

// @route   PUT /api/profile/password
// @desc    Đổi mật khẩu
// @access  Private
router.put('/password', authMiddleware, profileController.changePassword);

// @route   PUT /api/profile/interests
// @desc    Cập nhật sở thích
// @access  Private
router.put('/interests', authMiddleware, profileController.updateInterests);

// @route   GET /api/profile
// @desc    Lấy thông tin profile của user hiện tại
// @access  Private
router.get('/', authMiddleware, profileController.getProfile);

// @route   PUT /api/profile
// @desc    Cập nhật thông tin profile
// @access  Private
router.put('/', authMiddleware, profileController.updateProfile);

// @route   GET /api/profile/:userId
// @desc    Lấy thông tin public profile của user khác
// @access  Public
router.get('/:userId', profileController.getPublicProfile);

// @route   GET /api/profile/:userId/interests
// @desc    Lấy danh sách sở thích của user
// @access  Public
router.get('/:userId/interests', profileController.getInterests);

// @route   POST /api/profile/:userId/follow
// @desc    Theo dõi người dùng
// @access  Private
router.post('/:userId/follow', (req, res, next) => {
    console.log(`>>> [ROUTE] HIT POST /api/profile/${req.params.userId}/follow`);
    next();
}, authMiddleware, profileController.followUser);

// @route   DELETE /api/profile/:userId/unfollow
// @desc    Bỏ theo dõi người dùng
// @access  Private
router.delete('/:userId/unfollow', authMiddleware, profileController.unfollowUser);

module.exports = router;

