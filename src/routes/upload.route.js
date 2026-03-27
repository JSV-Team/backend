const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middlewares/auth.middleware');
const { upload, validateFileContent, handleUploadError, getFileInfo } = require('../middlewares/upload');
const storageService = require('../services/storage.service');

// All upload routes require authentication
router.use(verifyToken);

// POST /api/upload/avatar - Upload ảnh đại diện
router.post("/avatar", async (req, res, next) => {
  upload.single("avatar")(req, res, async (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "Vui lòng chọn ảnh đại diện để upload" 
      });
    }
    
    try {
      // Validate file content
      await new Promise((resolve, reject) => {
        validateFileContent(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Upload to Supabase Storage
      const publicUrl = await storageService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      const fileInfo = getFileInfo(req.file, publicUrl);
      
      // Update user avatar in database
      const { getPool } = require('../config/db');
      const pool = getPool();
      const userId = req.user.user_id;
      
      // Optional: Delete old avatar from storage if it was a Supabase URL
      const oldUser = await pool.query('SELECT avatar_url FROM users WHERE user_id = $1', [userId]);
      if (oldUser.rows[0]?.avatar_url && oldUser.rows[0].avatar_url.includes('supabase.co')) {
        await storageService.deleteFileByUrl(oldUser.rows[0].avatar_url);
      }
      
      await pool.query(
        'UPDATE users SET avatar_url = $1 WHERE user_id = $2',
        [publicUrl, userId]
      );
      
      console.log(`✅ Avatar uploaded to Supabase successfully: ${userId}`);
      
      res.json({ 
        success: true,
        message: 'Upload ảnh đại diện thành công',
        data: fileInfo
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      // Clean up uploaded file on error
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi upload ảnh đại diện'
      });
    }
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
          // Validate file content in memory
          await new Promise((resolve, reject) => {
            validateFileContent(req, res, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });

          // Upload to Supabase Storage
          const publicUrl = await storageService.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype
          );

          validatedFiles.push(getFileInfo(file, publicUrl));
        } catch (error) {
          validationErrors.push(`File ${file.originalname}: ${error.message || 'Lỗi upload'}`);
        }
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Một số file không hợp lệ hoặc lỗi upload',
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

    // Upload to Supabase Storage
    storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    ).then(publicUrl => {
      const fileInfo = getFileInfo(req.file, publicUrl);
      console.log(`✅ Image uploaded to Supabase successfully`);
      res.json({
        success: true,
        message: 'Upload ảnh thành công',
        data: fileInfo
      });
    }).catch(error => {
      console.error('Image upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi upload ảnh lên kho lưu trữ'
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
