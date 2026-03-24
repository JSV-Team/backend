const jwt = require('jsonwebtoken');

const isAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Bạn cần đăng nhập để truy cập."
            });
        }

        const secret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : null;
        if (!secret) {
            console.error('FATAL: JWT_SECRET environment variable is not set!');
            return res.status(500).json({ success: false, message: 'Lỗi cấu hình server!' });
        }
        
        jwt.verify(token, secret, (err, user) => {
            if (err) {
                console.error("JWT Verification failed at admin.middleware:", err.message);
                return res.status(403).json({
                    success: false,
                    message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
                });
            }

            // Case-insensitive role check
            if (user && user.role && user.role.toLowerCase() === 'admin') {
                req.user = user;
                next();
            } else {
                const userRole = user ? user.role : 'N/A';
                console.warn(`Admin access denied for user ${user ? (user.username || user.user_id) : 'unknown'}. Role: ${userRole}`);
                res.status(403).json({
                    success: false,
                    message: "Truy cập bị từ chối. Bạn không có quyền admin."
                });
            }
        });
    } catch (error) {
        console.error("isAdmin Middleware Error:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống trong quá trình xác thực." });
    }
};

module.exports = { isAdmin };
