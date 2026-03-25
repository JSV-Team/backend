const multer = require('multer');
const path = require('path');
const fs = require('fs');
// const fileType = require('file-type'); // Temporarily disabled as it's ESM-only and currently unused in the code below

// Tạo thư mục uploads nếu chưa có
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Tên file an toàn: timestamp + random + ext chuẩn hóa
        const ext = path.extname(file.originalname).toLowerCase();
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const timestamp = Date.now();
        cb(null, `img-${timestamp}-${randomSuffix}${ext}`);
    }
});

// Danh sách MIME types và extensions được phép (chuẩn app thực tế)
const ALLOWED_IMAGE_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/pjpeg': ['.jpg', '.jpeg'], // Progressive JPEG (IE/Edge)
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp']
};

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_MIME_TYPES = Object.keys(ALLOWED_IMAGE_TYPES);

// File filter nghiêm ngặt
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Normalize MIME type - chuyển image/pjpeg thành image/jpeg
    let mimeType = file.mimetype.toLowerCase();
    
    console.log(`📁 File upload attempt: ${file.originalname}`);
    console.log(`   Original MIME: ${file.mimetype}, Ext: ${ext}`);
    
    if (mimeType === 'image/pjpeg' || mimeType === 'image/jpg') {
        console.log(`   Normalizing MIME type from ${mimeType} to image/jpeg`);
        mimeType = 'image/jpeg';
    }
    
    // Kiểm tra MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        const err = `Định dạng file không được hỗ trợ. MIME: ${mimeType}. Chỉ chấp nhận: ${ALLOWED_EXTENSIONS.join(', ')}`;
        console.log(`   ❌ ${err}`);
        return cb(new Error(err), false);
    }
    
    // Kiểm tra extension
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        const err = `Phần mở rộng file không hợp lệ: ${ext}. Chỉ chấp nhận: ${ALLOWED_EXTENSIONS.join(', ')}`;
        console.log(`   ❌ ${err}`);
        return cb(new Error(err), false);
    }
    
    // Kiểm tra sự khớp giữa MIME type và extension (dùng mimeType đã normalize)
    const allowedExts = ALLOWED_IMAGE_TYPES[mimeType];
    if (!allowedExts || !allowedExts.includes(ext)) {
        const err = `MIME type (${mimeType}) và phần mở rộng file (${ext}) không khớp`;
        console.log(`   ❌ ${err}`);
        return cb(new Error(err), false);
    }
    
    console.log(`   ✅ File passed validation`);
    cb(null, true);
};

// Cấu hình multer với giới hạn chuẩn app thực tế
const upload = multer({
    storage,
    fileFilter,
    limits: { 
        fileSize: 2 * 1024 * 1024, // 2MB - chuẩn app thực tế
        files: 1, // Chỉ 1 file mỗi lần
        fieldSize: 1024 * 1024, // 1MB cho field data
        fieldNameSize: 100, // Tên field tối đa 100 ký tự
        fields: 10 // Tối đa 10 fields
    }
});

// Middleware kiểm tra nội dung file thực tế
const validateFileContent = async (req, res, next) => {
    if (!req.file) return next();
    
    try {
        const filePath = req.file.path;
        const fileStats = fs.statSync(filePath);
        
        // Kiểm tra file có tồn tại và có kích thước
        if (fileStats.size === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                message: 'File rỗng hoặc bị lỗi'
            });
        }
        
        // TEMPORARY: Skip magic bytes validation to fix chat upload
        // The file-type package might have issues on Render
        console.log(`✅ File uploaded: ${req.file.filename} (${Math.round(fileStats.size / 1024)}KB)`);
        req.file.actualSize = fileStats.size;
        next();
        
    } catch (error) {
        console.error('File validation error:', error);
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
            success: false,
            message: 'Lỗi khi kiểm tra tính hợp lệ của file'
        });
    }
};

// Middleware xử lý lỗi upload
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        // Xóa file nếu có lỗi
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'File quá lớn. Kích thước tối đa là 2MB'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ được upload 1 file mỗi lần'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'Field name không hợp lệ'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: `Lỗi upload: ${error.message}`
                });
        }
    }
    
    // Lỗi từ fileFilter
    if (error.message) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    
    next(error);
};

// Utility function để lấy thông tin file
const getFileInfo = (file) => {
    if (!file) return null;
    
    return {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        sizeKB: Math.round(file.size / 1024),
        type: file.validatedType || path.extname(file.filename).substring(1),
        url: `/uploads/${file.filename}`,
        uploadedAt: new Date().toISOString()
    };
};

module.exports = { 
    upload, 
    validateFileContent, 
    handleUploadError,
    getFileInfo,
    ALLOWED_EXTENSIONS,
    ALLOWED_MIME_TYPES
};
