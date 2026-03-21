const profileService = require('../services/profile-update.service');
const bcrypt = require('bcrypt');
const { getPool } = require('../config/db');

// Lấy thông tin profile của user hiện tại
const getProfile = async (req, res) => {
    try {
        const userId = req.user.user_id;
        
        const profile = await profileService.getUserProfile(userId);
        const interests = await profileService.getUserInterests(userId);
        
        return res.status(200).json({
            success: true,
            data: {
                ...profile,
                interests
            }
        });
    } catch (error) {
        console.error("Lỗi tại Profile Controller - getProfile:", error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Lỗi server nội bộ!"
        });
    }
};

// Lấy thông tin public profile của user khác
const getPublicProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const profile = await profileService.getUserProfile(userId);
        const interests = await profileService.getUserInterests(userId);

        return res.status(200).json({
            success: true,
            data: {
                user_id: profile.user_id,
                username: profile.username,
                full_name: profile.full_name,
                email: profile.email,
                avatar_url: profile.avatar_url,
                bio: profile.bio,
                location: profile.location,
                gender: profile.gender,
                dob: profile.dob,
                reputation_score: profile.reputation_score,
                created_at: profile.created_at,
                interests
            }
        });
    } catch (error) {
        console.error("Lỗi tại Profile Controller - getPublicProfile:", error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Lỗi server nội bộ!"
        });
    }
};

// Cập nhật thông tin profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { full_name, avatar_url, bio, location } = req.body;

        // Validate dữ liệu đầu vào
        if (full_name && full_name.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Họ tên không được quá 100 ký tự"
            });
        }

        if (bio && bio.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Bio không được quá 5000 ký tự"
            });
        }

        const profileData = {
            full_name,
            avatar_url,
            bio,
            location
        };

        const updatedProfile = await profileService.updateUserProfile(userId, profileData);
        const interests = await profileService.getUserInterests(userId);

        return res.status(200).json({
            success: true,
            message: "Cập nhật profile thành công",
            data: {
                ...updatedProfile,
                interests
            }
        });
    } catch (error) {
        console.error("Lỗi tại Profile Controller - updateProfile:", error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Lỗi server nội bộ!"
        });
    }
};

// Đổi mật khẩu
const changePassword = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu mới phải có ít nhất 6 ký tự"
            });
        }

        // Lấy password_hash từ DB
        const pool = getPool();
        const result = await pool.query('SELECT password_hash FROM Users WHERE user_id = $1', [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        const passwordHash = result.rows[0].password_hash;

        // Verify mật khẩu cũ
        const isMatch = await bcrypt.compare(currentPassword, passwordHash);
        
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu hiện tại không đúng"
            });
        }

        // Hash mật khẩu mới
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Cập nhật mật khẩu
        await pool.query('UPDATE Users SET password_hash = $1 WHERE user_id = $2', [newPasswordHash, userId]);

        return res.status(200).json({
            success: true,
            message: "Đổi mật khẩu thành công"
        });
    } catch (error) {
        console.error("Lỗi tại Profile Controller - changePassword:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server nội bộ!"
        });
    }
};

// Cập nhật sở thích
const updateInterests = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { interests } = req.body;

        if (!Array.isArray(interests)) {
            return res.status(400).json({
                success: false,
                message: "interests phải là một mảng"
            });
        }

        const updatedInterests = await profileService.updateUserInterests(userId, interests);

        return res.status(200).json({
            success: true,
            message: "Cập nhật sở thích thành công",
            data: updatedInterests
        });
    } catch (error) {
        console.error("Lỗi tại Profile Controller - updateInterests:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server nội bộ!"
        });
    }
};

module.exports = {
    getProfile,
    getPublicProfile,
    updateProfile,
    changePassword,
    updateInterests
};


