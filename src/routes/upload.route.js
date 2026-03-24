const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middlewares/auth.middleware');
const { upload, validateFileContent, handleUploadError, getFileInfo } = require('../middlewares/upload');

// All upload routes require authentication
router.use(verifyToken);

// POST /api/upload/avatar - Upload ảnh đại diện
router.post("/avatar", (req, res, next) => {
  upload.single("avatar")(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "Vui lòng chọn ảnh đại diện để upload" 
      });
    }
    
    // Validate file content
    validateFileContent(req, res, (validationErr) => {
      if (validationErr) return;
      
      const fileInfo = getFileInfo(req.file);
      const fullUrl = `${req.protocol}://${req.get('host')}${fileInfo.url}`;
      
      res.json({ 
        success: true,
        message: 'Upload ảnh đại diện thành công',
        data: {
          ...fileInfo,
          fullUrl
        }
      });
    });
  });
});

// POST /api/upload/post-media - Upload nhiều ảnh cho bài viết (tối đa 5 ảnh)
router.post("/post-media", (req, res, next) => {
  upload.array("media", 5)(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Vui lòng chọn ít nhất 1 ảnh để upload" 
      });
    }
    
    // Validate tất cả files
    let validationErrors = [];
    let validatedFiles = [];
    
    const validateFiles = async () => {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        req.file = file; // Set current file for validation
        
        try {
          await new Promise((resolve, reject) => {
            validateFileContent(req, res, (err) => {
              if (err) {
                validationErrors.push(`File ${file.originalname}: ${err.message || 'Không hợp lệ'}`);
              } else {
                validatedFiles.push(getFileInfo(file));
              }
              resolve();
            });
          });
        } catch (error) {
          validationErrors.push(`File ${file.originalname}: Lỗi validation`);
        }
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Một số file không hợp lệ',
          errors: validationErrors
        });
      }
      
      res.json({ 
        success: true,
        message: `Upload thành công ${validatedFiles.length} ảnh`,
        data: {
          files: validatedFiles,
          count: validatedFiles.length
        }
      });
    };
    
    validateFiles();
  });
});

// POST /api/upload/image - Upload ảnh đơn lẻ
router.post('/image', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'Vui lòng chọn ảnh để upload' 
      });
    }

    // Validate file content
    validateFileContent(req, res, (validationErr) => {
      if (validationErr) return;
      
      const fileInfo = getFileInfo(req.file);
      const fullUrl = `${req.protocol}://${req.get('host')}${fileInfo.url}`;
      
      res.json({
        success: true,
        message: 'Upload ảnh thành công',
        data: {
          ...fileInfo,
          fullUrl
        }
      });
    });
  });
});

// GET /api/upload/info/:filename - Lấy thông tin file
router.get('/info/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'File không tồn tại'
    });
  }
  
  const stats = fs.statSync(filePath);
  const ext = path.extname(filename).substring(1);
  
  res.json({
    success: true,
    data: {
      filename,
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      type: ext,
      url: `/uploads/${filename}`,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    }
  });
});

module.exports = router;
