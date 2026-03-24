const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fileType = require('file-type');

// Tạo thư mục uploads nếu chưa có
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Tên file: timestamp + random + ext gốc (VD: 1709558400000-abc123.jpg)
        const ext = path.extname(file.originalname).toLowerCase();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        cb(null, `${Date.now()}-${randomSuffix}${ext}`);
    }
});

// Kiểm tra file type nghiêm ngặt
const fileFilter = async (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error('MIME type không được phép. Chỉ chấp nhận ảnh JPG, PNG, GIF, WebP'), false);
    }
    
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        return cb(new Error('Phần mở rộng file không được phép'), false);
    }
    
    cb(null, true);
};

// Additional file content validation middleware
const validateFileContent = async (req, res, next) => {
    if (!req.file) return next();
    
    try {
        const filePath = req.file.path;
        const type = await fileType.fromFile(filePath);
        
        // Check if actual file type matches allowed types
        const allowedTypes = ['jpg', 'png', 'gif', 'webp'];
        if (!type || !allowedTypes.includes(type.ext)) {
            // Delete the uploaded file
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                message: 'File không phải là ảnh hợp lệ'
            });
        }
        
        next();
    } catch (error) {
        console.error('File validation error:', error);
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
            success: false,
            message: 'Lỗi khi kiểm tra file'
        });
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { 
        fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
        files: 1 // Chỉ cho phép 1 file
    }
});

module.exports = { upload, validateFileContent };
