const sql = require('mssql');

const isAdmin = (req, res, next) => {
    // Current dummy auth middleware in profile.routes.js uses x-auth-user-id
    // We will implement a slightly more robust one here or use what's available
    
    const role = req.headers['x-auth-user-role'];
    
    if (role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: "Truy cập bị từ chối. Bạn không có quyền admin."
        });
    }
};

module.exports = { isAdmin };
