const sql = require('mssql');

const getAdminStats = async (req, res) => {
    try {
        const pool = await sql.connect();
        
        const userCount = await pool.request().query("SELECT COUNT(*) as count FROM Users");
        const activityCount = await pool.request().query("SELECT COUNT(*) as count FROM Activities");
        const reportCount = await pool.request().query("SELECT COUNT(*) as count FROM Reports WHERE status = 'pending'");
        
        res.json({
            success: true,
            data: {
                totalUsers: userCount.recordset[0].count,
                totalActivities: activityCount.recordset[0].count,
                pendingReports: reportCount.recordset[0].count,
                activeUsersToday: 42 // Mocked for now
            }
        });
    } catch (error) {
        console.error("Admin Controller Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};

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
