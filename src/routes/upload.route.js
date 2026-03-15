const express = require('express');
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Use prefix based on fieldname or default to 'file'
    const prefix = file.fieldname === 'avatar' ? 'avatar' : (file.fieldname === 'image' ? 'image' : 'post');
    cb(null, prefix + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images and videos are allowed"));
    }
  },
});

// POST /api/upload/avatar
router.post("/avatar", upload.single("avatar"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const url = `/uploads/${req.file.filename}`;
  // Trả về cả url và fullUrl để frontend dễ sử dụng
  const fullUrl = `${req.protocol}://${req.get('host')}${url}`;
  res.json({ url, fullUrl });
});

// POST /api/upload/post-media (upload nhiều ảnh)
router.post("/post-media", upload.array("media", 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }
  const urls = req.files.map(f => `/uploads/${f.filename}`);
  res.json({ urls });
});

// POST /api/upload/image
router.post('/image', (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err.message);
            return res.status(400).json({ 
                message: err.message || 'Lỗi upload file',
                error: err.message 
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Không có file được upload' });
        }

        // Trả về URL công khai để FE dùng
        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({
            message: 'Upload thành công',
            imageUrl,
            filename: req.file.filename
        });
    });
});

module.exports = router;
