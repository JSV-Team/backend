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

        jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_admin_vibematch', (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
                });
            }

            if (user.role === 'admin') {
                req.user = user;
                next();
            } else {
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
