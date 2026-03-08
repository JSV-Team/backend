const loginService = require('../services/login.service');

const handleLogin = async (req, res) => {
    console.log(">>> ĐÃ CHẠM VÀO CONTROLLER!");
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập Email/Username và Mật khẩu!"
            });
        }

        // Gọi Service đi check DB
        const result = await loginService.verifyUser(identifier, password);

        if (!result.success) {
            // Trả về 403 nếu bị khóa, 401 nếu sai pass/tài khoản
            const statusCode = result.message.includes("khóa") ? 403 : 401;
            return res.status(statusCode).json({
                success: false,
                message: result.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công!",
            data: result.user
        });

    } catch (error) {
        console.error("Lỗi tại Login Controller:", error);
        return res.status(500).json({ success: false, message: "Lỗi server nội bộ!" });
    }
};

module.exports = { handleLogin };