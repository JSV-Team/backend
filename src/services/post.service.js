const postModel = require('../models/post.model');

/**
 * Service - Chứa business logic
 * Gọi Model để xử lý database
 */

const createPost = async (content, userId, imageUrl = null, additionalData = {}) => {
  try {
    // Gọi Model để insert bài viết (Activities table)
    const activityId = await postModel.insertPost(userId, content, imageUrl, additionalData);
    
    // Lấy bài viết vừa tạo để trả về
    const post = await postModel.getPostById(activityId);
    
    return post;
  } catch (error) {
    console.error('Error in createPost service:', error);
    throw error;
  }
};

const getAllPosts = async (limit = 50) => {
  try {
    // Gọi Model để lấy danh sách bài viết
    return await postModel.getAllPosts(limit);
  } catch (error) {
    console.error('Error in getAllPosts service:', error);
    throw error;
  }
};

module.exports = {
  createPost,
  getAllPosts
};
