const express = require('express');
const router = express.Router();
const path = require('path');
const upload = require('../middlewares/upload');

// POST /api/upload/image
router.post('/image', upload.single('image'), (req, res) => {
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

module.exports = router;
