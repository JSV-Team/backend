const jwt = require('jsonwebtoken');

/**
 * Middleware để xác thực JWT Token
 */
const verifyToken = (req, res, next) => {
    // Lấy token từ header Authorization (dạng: Bearer token)
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Bạn cần đăng nhập để thực hiện hành động này!"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Lưu thông tin user vào request để dùng ở các bước sau
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: "Mã xác thực không hợp lệ hoặc đã hết hạn!"
        });
    }
};

/**
 * Middleware để kiểm tra quyền Admin
 */
const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: "Bạn không có quyền truy cập vào khu vực này!"
        });
    }
    next();
};

module.exports = { verifyToken, isAdmin };
