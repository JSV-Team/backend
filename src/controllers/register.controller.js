const registerService = require('../services/register.service');

const handleRegister = async (req, res) => {
    try {
        const { email, username, password, full_name, location } = req.body;

        // Validate dữ liệu đầu vào
        if (!email || !username || !password) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập Email, Username và Mật khẩu!"
            });
        }

        // Kiểm tra mật khẩu đủ mạnh
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu phải có ít nhất 6 ký tự!"
            });
        }

        // Kiểm tra định dạng email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Email không hợp lệ!"
            });
        }

        // Gọi service để register
        const result = await registerService.registerUser(email, username, password, full_name, location);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        return res.status(201).json({
            success: true,
            message: result.message,
            data: result.user
        });

    } catch (error) {
        console.error("Lỗi tại Register Controller:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server nội bộ!"
        });
    }
};

module.exports = { handleRegister };
