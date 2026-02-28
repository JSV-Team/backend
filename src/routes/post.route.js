const express = require('express');
const router = express.Router();
const { createPost, getAllPosts } = require('../controllers/post.controller');
const { validateCreatePost } = require('../middlewares/post.middleware');

// POST /api/posts - Create a new post
router.post('/', validateCreatePost, createPost);

// GET /api/posts - Get all posts (nếu cần)
router.get('/', getAllPosts);

module.exports = router;
