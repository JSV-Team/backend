const profileService = require('../services/profile.service');
const bcrypt = require('bcrypt');
const { getPool } = require('../config/db');

// Lấy thông tin profile của user hiện tại
const getProfile = async (req, res) => {
    try {
        const userId = req.user.user_id;
        
        const profile = await profileService.getProfile(userId);
        const interests = await profileService.getInterests(userId);
        
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
        const myId = req.query.myId; // Optional myId for mutual context
        
        const profile = await profileService.getProfile(userId);
        const interests = await profileService.getInterests(userId);
        
        // New: Fetch follow stats
        const stats = await profileService.getFollowStats(userId);
        
        // New: Fetch mutual followers if myId provided
        let mutualFollowers = [];
        let isFollowing = false;
        if (myId && myId !== userId) {
            mutualFollowers = await profileService.getMutualFollowers(myId, userId);
            isFollowing = await profileService.isFollowing(myId, userId);
        }

        // New: Check for active story
        const hasStory = await profileService.hasActiveStory(userId);

        return res.status(200).json({
            success: true,
            data: {
                user_id: profile.user_id,
                username: profile.username,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                bio: profile.bio,
                location: profile.location,
                gender: profile.gender,
                reputation_score: profile.reputation_score,
                created_at: profile.created_at,
                // email và dob bị loại bỏ — không hiển thị cho public
                interests,
                stats: {
                    followers_count: stats.followers_count,
                    following_count: stats.following_count,
                    mutual_count: mutualFollowers.length
                },
                mutual_followers: mutualFollowers.slice(0, 3),
                has_story: hasStory,
                is_following: isFollowing
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
        const { full_name, email, gender, dob, avatar_url, bio, location } = req.body;

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
            email,
            gender,
            dob,
            avatar_url,
            bio,
            location
        };

        const updatedProfile = await profileService.updateProfile(userId, profileData);
        const interests = await profileService.getInterests(userId);

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
        const result = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [userId]);
        
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
        await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newPasswordHash, userId]);

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

        const updatedInterests = await profileService.updateInterests(userId, interests);

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

// Cập nhật profile bằng userId (không cần auth)
const updateProfileById = async (req, res) => {
    try {
        const { userId } = req.params;
        const { full_name, email, gender, dob, avatar_url, bio, location } = req.body;

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
            email,
            gender,
            dob,
            avatar_url,
            bio,
            location
        };

        const updatedProfile = await profileService.updateProfile(userId, profileData);
        const interests = await profileService.getInterests(userId);

        return res.status(200).json({
            success: true,
            message: "Cập nhật profile thành công",
            data: {
                ...updatedProfile,
                interests
            }
        });
    } catch (error) {
        console.error("Lỗi tại Profile Controller - updateProfileById:", error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Lỗi server nội bộ!"
        });
    }
};

// Lấy danh sách sở thích của user
const getInterests = async (req, res) => {
    try {
        const { userId } = req.params;
        const interests = await profileService.getInterests(userId);
        
        return res.status(200).json({
            success: true,
            data: interests
        });
    } catch (error) {
        console.error("Lỗi tại Profile Controller - getInterests:", error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Lỗi server nội bộ!"
        });
    }
};

const followUser = async (req, res) => {
    console.log(`>>> [CONTROLLER] followUser - target: ${req.params.userId}, my: ${req.user?.user_id}`);
    try {
        const myId = req.user.user_id;
        const targetId = parseInt(req.params.userId);
        await profileService.followUser(myId, targetId);
        res.json({ success: true, message: "Đã theo dõi" });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
};

const unfollowUser = async (req, res) => {
    try {
        const myId = req.user.user_id;
        const targetId = parseInt(req.params.userId);
        await profileService.unfollowUser(myId, targetId);
        res.json({ success: true, message: "Đã bỏ theo dõi" });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getProfile,
    getPublicProfile,
    updateProfile,
    changePassword,
    updateInterests,
    updateProfileById,
    getInterests,
    followUser,
    unfollowUser
};


