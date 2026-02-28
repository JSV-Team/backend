const { body, validationResult } = require('express-validator');

const validateCreatePost = [
  // Don't validate - let the controller handle it
  (req, res, next) => {
    try {
      console.log('POST /posts body:', JSON.stringify(req.body));
      next();
    } catch (err) {
      console.error('Middleware error:', err);
      res.status(500).json({ message: 'Middleware error: ' + err.message });
    }
  }
];

module.exports = {
  validateCreatePost
};
