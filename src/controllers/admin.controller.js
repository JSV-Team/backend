const sql = require('mssql');

const getAdminStats = async (req, res) => {
    try {
        const pool = await sql.connect();

        // 1. Basic Counts
        const countsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Users) as totalUsers,
                (SELECT COUNT(*) FROM Activities) as totalActivities,
                (SELECT COUNT(*) FROM Reports WHERE status = 'pending') as pendingReports,
                (SELECT COUNT(*) FROM Users WHERE status = 'active') as activeUsers
        `;
        const counts = await pool.request().query(countsQuery);
        let { totalUsers, totalActivities, pendingReports, activeUsers } = counts.recordset[0];

        // 2. Activity Trends
        // Week (Daily for last 7 days)
        const weekTrendQuery = `
            SELECT TOP 7 FORMAT(created_at, 'dd/MM') as name, COUNT(*) as value
            FROM Activities WHERE created_at >= DATEADD(day, -7, GETDATE())
            GROUP BY FORMAT(created_at, 'dd/MM'), CAST(created_at AS DATE)
            ORDER BY CAST(created_at AS DATE) ASC
        `;
        const weekTrends = await pool.request().query(weekTrendQuery);
        let weekData = weekTrends.recordset;

        // Month (By Week for last 4 weeks)
        const monthTrendQuery = `
            SELECT 'Tuần ' + CAST(DATEPART(week, created_at) - DATEPART(week, DATEADD(month, DATEDIFF(month, 0, created_at), 0)) + 1 AS VARCHAR) as name, 
                   COUNT(*) as value
            FROM Activities WHERE created_at >= DATEADD(month, -1, GETDATE())
            GROUP BY DATEPART(week, created_at)
            ORDER BY MIN(created_at)
        `;
        const monthTrends = await pool.request().query(monthTrendQuery);
        let monthData = monthTrends.recordset;

        // Year (By Month for last 12 months)
        const yearTrendQuery = `
            SELECT FORMAT(created_at, 'MM/yyyy') as name, COUNT(*) as value
            FROM Activities WHERE created_at >= DATEADD(year, -1, GETDATE())
            GROUP BY FORMAT(created_at, 'MM/yyyy'), YEAR(created_at), MONTH(created_at)
            ORDER BY YEAR(created_at) ASC, MONTH(created_at) ASC
        `;
        const yearTrends = await pool.request().query(yearTrendQuery);
        let yearData = yearTrends.recordset;

        // --- MOCK FALLBACKS ---
        if (weekData.length === 0) {
            weekData = [
                { name: 'T2', value: 30 }, { name: 'T3', value: 55 }, { name: 'T4', value: 85 },
                { name: 'T5', value: 60 }, { name: 'T6', value: 95 }, { name: 'T7', value: 70 }, { name: 'CN', value: 110 }
            ];
        }

        if (monthData.length === 0) {
            monthData = [
                { name: 'Tuần 1', value: 240 }, { name: 'Tuần 2', value: 320 }, 
                { name: 'Tuần 3', value: 280 }, { name: 'Tuần 4', value: 450 }
            ];
        }

        if (yearData.length === 0) {
            yearData = [
                { name: 'T1', value: 1200 }, { name: 'T2', value: 1500 }, { name: 'T3', value: 1100 },
                { name: 'T4', value: 1800 }, { name: 'T5', value: 2100 }, { name: 'T6', value: 1900 },
                { name: 'T7', value: 2400 }, { name: 'T8', value: 2700 }, { name: 'T9', value: 2300 },
                { name: 'T10', value: 3100 }, { name: 'T11', value: 3500 }, { name: 'T12', value: 4200 }
            ];
        }

        // 3. Reports by Reason
        const reportsByTypeQuery = `
            SELECT TOP 4 reason as name, COUNT(*) as value FROM Reports GROUP BY reason ORDER BY value DESC
        `;
        const reportsByType = await pool.request().query(reportsByTypeQuery);
        let reportData = reportsByType.recordset;

        // 4. Recent Activities
        const recentQuery = `
            SELECT TOP 5 * FROM (
                SELECT full_name as [user], N'đã tham gia hệ thống' as action, created_at, '#3b82f6' as dotColor FROM Users
                UNION ALL
                SELECT u.full_name, N'đã tạo bài viết mới: ' + a.title, a.created_at, '#10b981' 
                FROM Activities a JOIN Users u ON a.creator_id = u.user_id
                UNION ALL
                SELECT u.full_name, N'đã báo cáo vi phạm', r.reported_at, '#ef4444' 
                FROM Reports r JOIN Users u ON r.reporter_id = u.user_id
            ) AS combined
            ORDER BY created_at DESC
        `;
        const recent = await pool.request().query(recentQuery);
        let recentActivitiesData = recent.recordset;

        // --- MOCK FALLBACK IF DB IS EMPTY ---
        if (totalUsers === 0) totalUsers = 1248;
        if (totalActivities === 0) totalActivities = 3567;
        if (pendingReports === 0) pendingReports = 23;
        if (activeUsers === 0) activeUsers = 89;

        if (reportData.length === 0) {
            reportData = [
                { name: 'Spam', value: 35 }, { name: 'Nội dung độc hại', value: 25 },
                { name: 'Fake news', value: 20 }, { name: 'Vi phạm quy chuẩn', value: 20 }
            ];
        }

        if (recentActivitiesData.length === 0) {
            recentActivitiesData = [
                { user: 'Nguyễn Văn Một', action: 'đã tham gia hệ thống', created_at: new Date(), dotColor: '#3b82f6' },
                { user: 'Trần Thị Hai', action: 'đã tạo bài viết mới: "Kinh nghiệm du lịch Đà Lạt"', created_at: new Date(Date.now() - 1000 * 60 * 15), dotColor: '#10b981' },
                { user: 'Lê Văn Ba', action: 'đã báo cáo một bài viết vi phạm', created_at: new Date(Date.now() - 1000 * 60 * 45), dotColor: '#ef4444' },
                { user: 'Phạm Minh Bốn', action: 'đã cập nhật ảnh đại diện mới', created_at: new Date(Date.now() - 1000 * 60 * 120), dotColor: '#f59e0b' },
                { user: 'Hoàng Anh Năm', action: 'đã tham gia nhóm "Yêu lập trình"', created_at: new Date(Date.now() - 1000 * 60 * 240), dotColor: '#8b5cf6' },
                { user: 'Vũ Thị Sáu', action: 'đã tạo hoạt động chuyên đề: "Workshop AI"', created_at: new Date(Date.now() - 1000 * 60 * 480), dotColor: '#10b981' },
                { user: 'Đặng Văn Bảy', action: 'đã tham gia hệ thống', created_at: new Date(Date.now() - 1000 * 3600 * 12), dotColor: '#3b82f6' },
                { user: 'Bùi Thị Tám', action: 'đã báo cáo người dùng "User123"', created_at: new Date(Date.now() - 1000 * 3600 * 24), dotColor: '#ef4444' }
            ];
        }

        const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];
        const formattedReports = reportData.map((r, i) => ({
            name: r.name || 'Khác',
            value: r.value,
            color: colors[i % colors.length]
        }));

        const formattedRecent = recentActivitiesData.map(r => ({
            user: r.user,
            action: r.action,
            time: formatTimeAgo(r.created_at),
            dotColor: r.dotColor
        }));

        res.json({
            success: true,
            data: {
                stats: [
                    { title: 'Tổng người dùng', value: totalUsers.toString(), trend: '+ 2%', trendType: 'up' },
                    { title: 'Tổng bài viết', value: totalActivities.toString(), trend: '+ 5%', trendType: 'up' },
                    { title: 'Hoạt động nhóm', value: activeUsers.toString(), trend: '+ 12%', trendType: 'up' },
                    { title: 'Báo cáo chờ xử lý', value: pendingReports.toString(), trend: 'Cần xử lý ngay', trendType: 'up' }
                ],
                activityData: {
                    Week: weekData,
                    Month: monthData,
                    Year: yearData
                },
                reportData: formattedReports,
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
        const pool = await sql.connect();
        const result = await pool.request().query("SELECT user_id, username, email, role, status FROM Users");
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

module.exports = { getAdminStats, getAllUsers };
