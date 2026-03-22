const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { verifyToken, isOwner } = require('../middlewares/auth.middleware');

// @route   PUT /api/profile/password
// @desc    Đổi mật khẩu
// @access  Private
router.put('/password', verifyToken, profileController.changePassword);

// @route   PUT /api/profile/interests
// @desc    Cập nhật sở thích
// @access  Private
router.put('/interests', verifyToken, profileController.updateInterests);

// @route   GET /api/profile
// @desc    Lấy thông tin profile của user hiện tại
// @access  Private
router.get('/', verifyToken, profileController.getProfile);

// @route   PUT /api/profile
// @desc    Cập nhật thông tin profile
// @access  Private
router.put('/', verifyToken, profileController.updateProfile);

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
router.post('/:userId/follow', verifyToken, profileController.followUser);

// @route   DELETE /api/profile/:userId/unfollow
// @desc    Bỏ theo dõi người dùng
// @access  Private
router.delete('/:userId/unfollow', verifyToken, profileController.unfollowUser);

// NEW: Quản trị viên cập nhật profile người dùng
// @route   PUT /api/profile/admin/:userId
// @desc    Admin cập nhật profile user bất kỳ
// @access  Admin Only
router.put('/admin/:userId', verifyToken, isOwner('userId'), profileController.updateProfileById);

module.exports = router;

