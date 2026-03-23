const { getPool } = require('../config/db');

const getAdminStats = async (req, res) => {
    try {
        const pool = getPool();

        const countsResult = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as "totalUsers",
                (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as "usersThisWeek",
                (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') as "usersLastWeek",
                (SELECT COUNT(*) FROM activities) as "totalActivities",
                (SELECT COUNT(*) FROM activities WHERE created_at >= NOW() - INTERVAL '7 days') as "activitiesThisWeek",
                (SELECT COUNT(*) FROM activities WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') as "activitiesLastWeek",
                (SELECT COUNT(*) FROM reports WHERE status = 'pending') as "pendingReports",
                (SELECT COUNT(*) FROM reports WHERE status = 'pending' AND created_at >= NOW() - INTERVAL '7 days') as "pendingReportsThisWeek",
                (SELECT COUNT(*) FROM users WHERE status = 'active') as "activeUsers"
        `);

        let { totalUsers, usersThisWeek, usersLastWeek, totalActivities, activitiesThisWeek,
            activitiesLastWeek, pendingReports, pendingReportsThisWeek, activeUsers } = countsResult.rows[0];

        // Convert strings to numbers
        totalUsers = parseInt(totalUsers); usersThisWeek = parseInt(usersThisWeek);
        usersLastWeek = parseInt(usersLastWeek); totalActivities = parseInt(totalActivities);
        activitiesThisWeek = parseInt(activitiesThisWeek); activitiesLastWeek = parseInt(activitiesLastWeek);
        pendingReports = parseInt(pendingReports); pendingReportsThisWeek = parseInt(pendingReportsThisWeek);
        activeUsers = parseInt(activeUsers);

        const calculateTrend = (curr, last) => {
            if (last === 0) return curr > 0 ? '+100%' : '0%';
            const percent = ((curr - last) / last * 100).toFixed(0);
            return (percent >= 0 ? '+ ' : '- ') + Math.abs(percent) + '%';
        };

        // Week trend
        const weekTrendResult = await pool.query(`
            WITH Last7Days AS (
                SELECT generate_series(
                    CURRENT_DATE - INTERVAL '6 days',
                    CURRENT_DATE,
                    INTERVAL '1 day'
                )::date AS date_value
            )
            SELECT 
                TO_CHAR(d.date_value, 'DD/MM') as name,
                COUNT(a.activity_id) as value
            FROM Last7Days d
            LEFT JOIN activities a ON a.created_at::date = d.date_value
            GROUP BY d.date_value
            ORDER BY d.date_value ASC
        `);
        let weekData = weekTrendResult.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

        // Month trend
        const monthTrendResult = await pool.query(`
            SELECT 
                'Tuần ' || CEIL(EXTRACT(DAY FROM created_at) / 7.0)::int AS name,
                COUNT(*) as value
            FROM activities 
            WHERE created_at >= NOW() - INTERVAL '1 month'
            GROUP BY name
            ORDER BY name
        `);
        let monthData = monthTrendResult.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

        // Year trend
        const yearTrendResult = await pool.query(`
            SELECT 
                TO_CHAR(created_at, 'MM/YYYY') as name,
                COUNT(*) as value
            FROM activities 
            WHERE created_at >= NOW() - INTERVAL '1 year'
            GROUP BY TO_CHAR(created_at, 'MM/YYYY'), EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
            ORDER BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
        `);
        let yearData = yearTrendResult.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

        if (weekData.length === 0) weekData = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map(n => ({ name: n, value: 0 }));
        if (monthData.length === 0) monthData = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'].map(n => ({ name: n, value: 0 }));
        if (yearData.length === 0) yearData = [{ name: '01/2026', value: 0 }, { name: '02/2026', value: 0 }, { name: '03/2026', value: 0 }];

        // Match stats
        const matchStatsResult = await pool.query(`
            SELECT 
                COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending,
                COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int as rejected,
                COUNT(CASE WHEN status = 'ended' THEN 1 END)::int as ended
            FROM match_sessions
        `);
        let matchStats = matchStatsResult.rows[0];

        const matchClassResult = await pool.query(`
            SELECT match_type as name, COUNT(*)::int as value 
            FROM match_sessions 
            GROUP BY match_type
        `);
        let matchClassification = matchClassResult.rows.map(r => ({
            name: r.name === 'random' ? 'Ngẫu nhiên' : (r.name === 'selective' ? 'Chọn lọc' : (r.name || 'Khác')),
            value: r.value
        }));

        const recentMatchesResult = await pool.query(`
            SELECT m.match_id, m.status, m.created_at,
                u1.full_name as user1_name, u1.avatar_url as user1_avatar,
                u2.full_name as user2_name, u2.avatar_url as user2_avatar
            FROM match_sessions m
            JOIN users u1 ON m.user_one = u1.user_id
            JOIN users u2 ON m.user_two = u2.user_id
            ORDER BY m.created_at DESC
            LIMIT 3
        `);
        let recentMatches = recentMatchesResult.rows.map(m => ({
            id: m.match_id,
            pair: `${(m.user1_name || 'N/A').split(' ').pop()} - ${(m.user2_name || 'N/A').split(' ').pop()}`,
            time: formatTimeAgo(m.created_at),
            status: m.status === 'active' ? 'Đang hoạt động' : (m.status === 'pending' ? 'Đang chờ' : (m.status === 'rejected' ? 'Từ chối' : 'Kết thúc')),
            avatars: [m.user1_avatar, m.user2_avatar]
        }));

        // Reports by type
        const reportsByTypeResult = await pool.query(`
            SELECT reason as name, COUNT(*)::int as value 
            FROM reports 
            GROUP BY reason 
            ORDER BY value DESC 
            LIMIT 4
        `);
        let reportData = reportsByTypeResult.rows;

        // Recent activities
        const recentResult = await pool.query(`
            SELECT * FROM (
                SELECT full_name as "user", 'đã tham gia hệ thống' as action, created_at, '#3b82f6' as "dotColor" FROM users
                UNION ALL
                SELECT u.full_name, 'đã tạo bài viết: ' || a.title, a.created_at, '#10b981'
                FROM activities a JOIN users u ON a.creator_id = u.user_id
                UNION ALL
                SELECT u.full_name, 'đã báo cáo vi phạm', r.created_at, '#ef4444'
                FROM reports r JOIN users u ON r.reporter_id = u.user_id
            ) combined
            ORDER BY created_at DESC
            LIMIT 8
        `);
        let formattedRecent = recentResult.rows.map(r => ({
            user: r.user, action: r.action,
            time: formatTimeAgo(r.created_at), dotColor: r.dotColor
        }));

        res.json({
            success: true,
            data: {
                stats: [
                    { title: 'Tổng người dùng', value: totalUsers.toLocaleString(), trend: calculateTrend(usersThisWeek, usersLastWeek), trendType: usersThisWeek >= usersLastWeek ? 'up' : 'down' },
                    { title: 'Tổng bài viết', value: totalActivities.toLocaleString(), trend: calculateTrend(activitiesThisWeek, activitiesLastWeek), trendType: activitiesThisWeek >= activitiesLastWeek ? 'up' : 'down' },
                    { title: 'Người dùng hoạt động', value: activeUsers.toLocaleString(), trend: '+ 2%', trendType: 'up' },
                    { title: 'Báo cáo chờ xử lý', value: pendingReports.toLocaleString(), trend: `+ ${pendingReportsThisWeek} mới`, trendType: 'up' }
                ],
                activityData: { Week: weekData, Month: monthData, Year: yearData },
                matchData: { stats: matchStats, classification: matchClassification, recent: recentMatches },
                reportData,
                recentActivities: formattedRecent
            }
        });
    } catch (error) {
        console.error("Admin Controller Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

function formatTimeAgo(date) {
    if (!date) return 'Vừa xong';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Vừa xong';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return new Date(date).toLocaleDateString();
}

const getAllUsers = async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT u.user_id, u.username, u.full_name, u.email, u.role, u.status, u.is_locked, u.created_at,
                COUNT(a.activity_id) as posts
            FROM users u
            LEFT JOIN activities a ON a.creator_id = u.user_id
            GROUP BY u.user_id
            ORDER BY u.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("GetAllUsers Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const toggleUserStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const pool = getPool();
        await pool.query("UPDATE users SET status = $1 WHERE user_id = $2", [status, id]);
        res.json({ success: true, message: `Người dùng đã được ${status === 'banned' ? 'cấm' : 'bỏ cấm'} thành công!` });
    } catch (error) {
        console.error("ToggleUserStatus Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const toggleUserLock = async (req, res) => {
    const { id } = req.params;
    const { isLocked } = req.body;
    try {
        const pool = getPool();
        await pool.query("UPDATE users SET is_locked = $1 WHERE user_id = $2", [isLocked, id]);
        res.json({ success: true, message: `Tài khoản đã được ${isLocked ? 'khóa' : 'mở khóa'} thành công!` });
    } catch (error) {
        console.error("ToggleUserLock Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const getAllActivities = async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT a.activity_id AS id, a.title, a.description, a.status, a.created_at,
                a.location, a.max_participants, a.duration_minutes,
                u.full_name AS "user",
                (SELECT COUNT(report_id) FROM reports r WHERE r.reported_activity_id = a.activity_id) AS reports,
                i.name AS tag_name,
                img.image_url
            FROM activities a
            LEFT JOIN users u ON a.creator_id = u.user_id
            LEFT JOIN activity_tags at2 ON a.activity_id = at2.activity_id
            LEFT JOIN interests i ON at2.interest_id = i.interest_id
            LEFT JOIN activity_images img ON a.activity_id = img.activity_id
            ORDER BY a.created_at DESC
        `);

        const activityMap = new Map();
        result.rows.forEach(row => {
            if (!row.id) return;
            if (!activityMap.has(row.id)) {
                activityMap.set(row.id, { 
                    id: row.id,
                    title: row.title,
                    status: row.status,
                    created_at: row.created_at,
                    content: row.description,
                    location: row.location,
                    max_participants: row.max_participants,
                    duration_minutes: row.duration_minutes,
                    user: row.user,
                    reports: parseInt(row.reports) || 0,
                    time: formatTimeAgo(row.created_at),
                    tags: new Set(),
                    images: new Set()
                });
            }
            const act = activityMap.get(row.id);
            if (row.tag_name) act.tags.add(row.tag_name);
            if (row.image_url) act.images.add(row.image_url);
        });

        const formatted = Array.from(activityMap.values()).map(act => ({
            ...act,
            tags: act.tags.size > 0 ? Array.from(act.tags) : ['Hoạt động'],
            images: Array.from(act.images),
            image_url: Array.from(act.images)[0] || null
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error("GetAllActivities Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!", error: error.message });
    }
};

const updateActivityStatus = async (req, res) => {
    const { id } = req.params;
    let { status } = req.body;
    if (status === 'published' || status === 'active') status = 'active';
    if (status === 'removed') status = 'deleted';
    try {
        const pool = getPool();
        await pool.query("UPDATE activities SET status = $1 WHERE activity_id = $2", [status, id]);
        res.json({ success: true, message: "Cập nhật trạng thái thành công!" });
    } catch (error) {
        console.error("UpdateStatus Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const getAllReports = async (req, res) => {
    try {
        const pool = getPool();
        const statsResult = await pool.query(`
            SELECT 
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
                COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed
            FROM reports
        `);
        const stats = statsResult.rows[0];

        const reportsResult = await pool.query(`
            SELECT r.report_id AS id, u1.full_name AS reporter, u2.full_name AS reported_user,
                a.title AS reported_activity, r.reason, r.status, r.created_at
            FROM reports r
            LEFT JOIN users u1 ON r.reporter_id = u1.user_id
            LEFT JOIN users u2 ON r.reported_user_id = u2.user_id
            LEFT JOIN activities a ON r.reported_activity_id = a.activity_id
            ORDER BY r.created_at DESC
        `);

        const reports = reportsResult.rows.map(repo => ({
            ...repo,
            time: formatTimeAgo(repo.created_at),
            target: repo.reported_user ? `người dùng ${repo.reported_user}` : (repo.reported_activity ? `bài viết "${repo.reported_activity}"` : "không rõ")
        }));

        res.json({
            success: true,
            data: {
                stats: [
                    { label: 'Chờ xử lý', value: parseInt(stats.pending) || 0, type: 'pending' },
                    { label: 'Đã xử lý', value: parseInt(stats.resolved) || 0, type: 'resolved' },
                    { label: 'Đã bỏ qua', value: parseInt(stats.dismissed) || 0, type: 'dismissed' }
                ],
                reports
            }
        });
    } catch (error) {
        console.error("GetAllReports Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const updateReportStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const pool = getPool();
        await pool.query("UPDATE reports SET status = $1 WHERE report_id = $2", [status, id]);
        res.json({ success: true, message: "Cập nhật trạng thái báo cáo thành công!" });
    } catch (error) {
        console.error("UpdateReportStatus Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const getDetailedStatistics = async (req, res) => {
    try {
        const pool = getPool();

        const growthResult = await pool.query(`
            SELECT 
                COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) THEN 1 END) as "currentUsers",
                COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN 1 END) as "lastUsers"
            FROM users
        `);
        const actGrowthResult = await pool.query(`
            SELECT 
                COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) THEN 1 END) as "currentActivities",
                COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN 1 END) as "lastActivities"
            FROM activities
        `);
        const matchGrowthResult = await pool.query(`
            SELECT 
                COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) THEN 1 END) as "currentMatches",
                COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN 1 END) as "lastMatches"
            FROM match_sessions
        `);

        const { currentUsers, lastUsers } = growthResult.rows[0];
        const { currentActivities, lastActivities } = actGrowthResult.rows[0];
        const { currentMatches, lastMatches } = matchGrowthResult.rows[0];

        const calculateGrowth = (curr, last) => {
            curr = parseInt(curr); last = parseInt(last);
            if (last === 0) return curr > 0 ? '+100' : '0';
            const g = ((curr - last) / last) * 100;
            return (g >= 0 ? '+' : '') + g.toFixed(0);
        };

        const trendsResult = await pool.query(`
            SELECT TO_CHAR(m, 'MM/YYYY') as name,
                (SELECT COUNT(*) FROM users u WHERE TO_CHAR(u.created_at, 'MM/YYYY') = TO_CHAR(m, 'MM/YYYY'))::int as users,
                (SELECT COUNT(*) FROM activities a WHERE TO_CHAR(a.created_at, 'MM/YYYY') = TO_CHAR(m, 'MM/YYYY'))::int as posts
            FROM generate_series(NOW() - INTERVAL '5 months', NOW(), INTERVAL '1 month') m
            ORDER BY m
        `);
        let userActivityTrend = trendsResult.rows;

        const matchTrendResult = await pool.query(`
            SELECT TO_CHAR(m, 'MM/YYYY') as name,
                (SELECT COUNT(*) FROM match_sessions ms WHERE TO_CHAR(ms.created_at, 'MM/YYYY') = TO_CHAR(m, 'MM/YYYY'))::int as value
            FROM generate_series(NOW() - INTERVAL '5 months', NOW(), INTERVAL '1 month') m
            ORDER BY m
        `);
        let finalMatchData = matchTrendResult.rows;

        const interestsResult = await pool.query(`
            SELECT 
                i.name, 
                COUNT(ui.interest_id)::int as value 
            FROM interests i
            JOIN user_interests ui ON i.interest_id = ui.interest_id
            -- "Emerging": interests added to profiles in the last 30 days
            WHERE ui.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY i.interest_id, i.name 
            ORDER BY value DESC
            LIMIT 6
        `);

        let interests = interestsResult.rows;

        // Fallback to all-time popularity if no recent activity
        if (interests.length === 0) {
            const allTimeResult = await pool.query(`
                SELECT i.name, COUNT(ui.user_id)::int as value 
                FROM interests i
                JOIN user_interests ui ON i.interest_id = ui.interest_id
                GROUP BY i.interest_id, i.name 
                ORDER BY value DESC
                LIMIT 6
            `);
            interests = allTimeResult.rows;
        }

        res.json({
            success: true,
            data: {
                growthStats: [
                    { title: 'Tăng trưởng User', value: calculateGrowth(currentUsers, lastUsers), subtext: 'so với tháng trước', type: 'user' },
                    { title: 'Tăng trưởng Bài viết', value: calculateGrowth(currentActivities, lastActivities), subtext: 'so với tháng trước', type: 'post' },
                    { title: 'Ghép đôi thành công', value: calculateGrowth(currentMatches, lastMatches), subtext: 'so với tháng trước', type: 'match' }
                ],
                trends: userActivityTrend,
                matchTrends: finalMatchData,
                popularInterests: interests
            }
        });
    } catch (error) {
        console.error("Detailed Stats Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const searchAdmin = async (req, res) => {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json({ success: true, data: [] });
    try {
        const pool = getPool();
        const searchTerm = `%${q.trim()}%`;
        const usersResult = await pool.query(`
            SELECT user_id as id, username as title, email as subtitle, 'user' as type
            FROM users
            WHERE username ILIKE $1 OR email ILIKE $1 OR full_name ILIKE $1
            LIMIT 5
        `, [searchTerm]);
        const activitiesResult = await pool.query(`
            SELECT a.activity_id as id, a.title, u.full_name as subtitle, 'activity' as type
            FROM activities a
            LEFT JOIN users u ON a.creator_id = u.user_id
            WHERE a.title ILIKE $1 OR a.description ILIKE $1 OR u.full_name ILIKE $1
            LIMIT 5
        `, [searchTerm]);
        res.json({ success: true, data: [...usersResult.rows, ...activitiesResult.rows] });
    } catch (error) {
        console.error("Search Admin Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const getSystemSettings = async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query("SELECT config_key, config_value FROM system_config");
        // Convert array of rows to flat object { key: value }
        const data = {};
        result.rows.forEach(row => {
            data[row.config_key] = row.config_value;
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error("GetSystemSettings Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const updateSystemSettings = async (req, res) => {
    const settings = req.body;
    try {
        const pool = getPool();
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(`
                INSERT INTO system_config (config_key, config_value) VALUES ($1, $2)
                ON CONFLICT (config_key) DO UPDATE SET config_value = $2, updated_at = NOW()
            `, [key, String(value)]);
        }
        res.json({ success: true, message: "Cập nhật cài đặt thành công!" });
    } catch (error) {
        console.error("UpdateSystemSettings Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const getBannedKeywords = async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query("SELECT keyword_id AS id, keyword FROM banned_keywords ORDER BY created_at DESC");
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("GetBannedKeywords Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const addBannedKeyword = async (req, res) => {
    const { keyword } = req.body;
    if (!keyword || keyword.trim().length === 0) {
        return res.status(400).json({ success: false, message: "Từ khóa không được để trống!" });
    }
    try {
        const pool = getPool();
        await pool.query(`
            INSERT INTO banned_keywords (keyword) VALUES ($1)
            ON CONFLICT (keyword) DO NOTHING
        `, [keyword.trim().toLowerCase()]);
        res.json({ success: true, message: "Thêm từ khóa thành công!" });
    } catch (error) {
        console.error("AddBannedKeyword Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const deleteBannedKeyword = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = getPool();
        await pool.query("DELETE FROM banned_keywords WHERE keyword_id = $1", [id]);
        res.json({ success: true, message: "Xóa từ khóa thành công!" });
    } catch (error) {
        console.error("DeleteBannedKeyword Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

const getUserInterestsReport = async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT u.user_id, u.full_name, u.avatar_url, 
                   COALESCE(json_agg(i.name) FILTER (WHERE i.name IS NOT NULL), '[]'::json) as interests
            FROM users u
            LEFT JOIN user_interests ui ON u.user_id = ui.user_id
            LEFT JOIN interests i ON ui.interest_id = i.interest_id
            GROUP BY u.user_id, u.full_name, u.avatar_url
            ORDER BY u.full_name
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("GetUserInterestsReport Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

module.exports = {
    getAdminStats, getAllUsers, toggleUserStatus, toggleUserLock,
    getAllActivities, updateActivityStatus, getAllReports, updateReportStatus,
    getDetailedStatistics, searchAdmin, getSystemSettings, updateSystemSettings,
    getBannedKeywords, addBannedKeyword, deleteBannedKeyword,
    getUserInterestsReport
};