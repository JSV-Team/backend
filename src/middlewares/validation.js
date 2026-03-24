const { body, param, query, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username phải từ 3-50 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username chỉ chứa chữ, số và dấu gạch dưới'),
  
  body('email')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Mật khẩu phải từ 6-100 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải có ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
  
  body('full_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Họ tên không được quá 100 ký tự')
    .trim(),
  
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Địa chỉ không được quá 100 ký tự')
    .trim(),
  
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Email hoặc username là bắt buộc')
    .trim(),
  
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc'),
  
  handleValidationErrors
];

// User ID parameter validation
const validateUserId = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('User ID phải là số nguyên dương'),
  
  handleValidationErrors
];

// Post creation validation
const validatePost = [
  body('title')
    .isLength({ min: 5, max: 200 })
    .withMessage('Tiêu đề phải từ 5-200 ký tự')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Mô tả không được quá 2000 ký tự')
    .trim(),
  
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Địa điểm không được quá 100 ký tự')
    .trim(),
  
  body('duration_minutes')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Thời gian phải từ 1-1440 phút'),
  
  body('max_participants')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Số người tham gia tối đa phải từ 1-1000'),
  
  handleValidationErrors
];

// Chat message validation
const validateMessage = [
  body('content')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Nội dung tin nhắn phải từ 1-1000 ký tự')
    .trim(),
  
  body('msg_type')
    .isIn(['text', 'image', 'system', 'location'])
    .withMessage('Loại tin nhắn không hợp lệ'),
  
  handleValidationErrors
];

// Interest validation
const validateInterests = [
  body('interests')
    .isArray({ min: 1, max: 10 })
    .withMessage('Phải chọn từ 1-10 sở thích'),
  
  body('interests.*')
    .isInt({ min: 1 })
    .withMessage('ID sở thích phải là số nguyên dương'),
  
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateUserId,
  validatePost,
  validateMessage,
  validateInterests,
  handleValidationErrors
};