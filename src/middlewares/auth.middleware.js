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
        const secret = process.env.JWT_SECRET || 'vibematch_secret_key_2024';
        const decoded = jwt.verify(token, secret);
        console.log(`JWT verified for user_id: ${decoded.user_id}, role: ${decoded.role}`);
        req.user = decoded; // Dữ liệu từ token: { user_id, role, ... }
        next();
    } catch (error) {
        console.error("JWT Verification error in auth.middleware:", error.message);
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
    if (!req.user || !req.user.role || req.user.role.toLowerCase() !== 'admin') {
        const roleStr = req.user ? req.user.role : 'undefined';
        console.warn(`Admin access denied. Current role: ${roleStr}`);
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
