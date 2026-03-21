const jwt = require('jsonwebtoken');

/**
 * Middleware để xác định token và gán user vào req
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers['x-auth-token'];
    const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Bạn cần đăng nhập để thực hiện hành động này!"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Dữ liệu từ token: { user_id, role, ... }
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: "Mã xác thực không hợp lệ hoặc đã hết hạn!"
        });
    }
};

/**
 * Middleware kiểm tra quyền Admin
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

/**
 * Middleware kiểm tra quyền sở hữu (Chống IDOR)
 * So sánh req.user.user_id với ID trong params (mặc định là userId hoặc id)
 */
const isOwner = (paramName = 'userId') => {
    return (req, res, next) => {
        const authenticatedUserId = req.user.user_id;
        const targetResourceId = parseInt(req.params[paramName]);

        if (authenticatedUserId !== targetResourceId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền thao tác trên dữ liệu của người khác!"
            });
        }
        next();
    };
};

module.exports = { verifyToken, isAdmin, isOwner };
