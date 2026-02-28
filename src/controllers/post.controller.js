const asyncHandler = require('express-async-handler');
const postService = require('../services/post.service');

const createPost = asyncHandler(async (req, res) => {
  console.log('[POST CONTROLLER] ===== STARTING =====');
  const { content, imageUrl, description, location, maxParticipants, duration, title } = req.body;
  
  console.log('[POST CONTROLLER] Received:', { content, title, description });
  
  // Get userId from request - use userId=2 for testing (temporary login)
  const userId = req.body.userId || 2;

  // Map the fields to match what the service expects
  const postContent = title || content || '';
  console.log('[POST CONTROLLER] postContent:', postContent);
  try {
    console.log('[POST CONTROLLER] Calling service...');
    const result = await postService.createPost(postContent, userId, imageUrl, {
      description,
      location,
      maxParticipants: parseInt(maxParticipants) || 10,
      duration: parseInt(duration) || 60
    });

    console.log('[POST CONTROLLER] Success:', result);
    res.status(201).json(result);
  } catch (error) {
    console.error('[POST CONTROLLER] Error:', error.message, error.stack);
    res.status(500).json({
      message: 'Failed: ' + error.message
    });
  }
});

const getAllPosts = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const posts = await postService.getAllPosts(parseInt(limit) || 50);
  res.status(200).json(posts);
});

module.exports = {
  createPost,
  getAllPosts
};
