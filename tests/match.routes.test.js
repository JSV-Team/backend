const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock dependencies before requiring anything
jest.mock('../src/config/db', () => {
  const mockQuery = jest.fn();
  return {
    getPool: jest.fn(() => ({ query: mockQuery })),
    __mockQuery: mockQuery
  };
});

// Create mock auth middleware function
const mockAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Bạn cần đăng nhập để thực hiện hành động này!"
    });
  }
  
  if (token === 'invalid-token') {
    return res.status(403).json({
      success: false,
      message: "Mã xác thực không hợp lệ hoặc đã hết hạn!"
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Mã xác thực không hợp lệ hoặc đã hết hạn!"
    });
  }
};

// Mock the auth middleware - must be done before requiring match.routes
// Return function as default export AND named exports
jest.mock('../src/middleware/auth.middleware', () => {
  return Object.assign(mockAuthMiddleware, {
    verifyToken: mockAuthMiddleware,
    isAdmin: (req, res, next) => next()
  });
});

// Mock matchService - match.routes.js uses '../services/matchService' (relative from src/routes)
jest.mock('../src/services/matchService', () => ({
  getMatchHistory: jest.fn()
}));

// Now require the app after mocks are set up
const app = require('../src/app');
const matchService = require('../src/services/matchService');
const { getPool, __mockQuery } = require('../src/config/db');

// Generate test JWT token
const generateToken = (userId = 1, role = 'user') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );
};

describe('Match Routes Integration Tests', () => {
  let authToken;
  let invalidToken;
  
  beforeAll(() => {
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-key';
    authToken = generateToken(1);
    invalidToken = 'invalid-token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/match/join', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/match/join')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('đăng nhập');
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .post('/api/match/join')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should join match queue with valid auth', async () => {
      const response = await request(app)
        .post('/api/match/join')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('tham gia');
      expect(response.body.data).toHaveProperty('userId', 1);
      expect(response.body.data).toHaveProperty('status', 'searching');
    });

    it('should join match queue with interests filter', async () => {
      const interests = [1, 2, 3];
      const response = await request(app)
        .post('/api/match/join')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ interests });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/match/cancel', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/match/cancel')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('đăng nhập');
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .post('/api/match/cancel')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should cancel match search with valid auth', async () => {
      const response = await request(app)
        .post('/api/match/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('hủy');
      expect(response.body.data).toHaveProperty('userId', 1);
      expect(response.body.data).toHaveProperty('status', 'cancelled');
    });
  });

  describe('GET /api/match/history', () => {
    const mockMatchHistory = [
      {
        match_id: 1,
        user_one: 1,
        user_two: 2,
        match_type: 'interest',
        status: 'active',
        created_at: '2026-03-21T16:54:57.093Z',
        matched_user_id: 2,
        matched_username: 'user2',
        matched_full_name: 'User Two',
        matched_avatar_url: 'http://example.com/avatar2.jpg',
        matched_bio: 'Bio for user 2'
      }
    ];

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/match/history');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('đăng nhập');
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .get('/api/match/history')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should get match history with valid auth (default limit)', async () => {
      matchService.getMatchHistory.mockResolvedValue(mockMatchHistory);

      const response = await request(app)
        .get('/api/match/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMatchHistory);
    });

    it('should get match history with custom limit', async () => {
      matchService.getMatchHistory.mockResolvedValue(mockMatchHistory);

      const response = await request(app)
        .get('/api/match/history?limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMatchHistory);
    });

    it('should return 400 for invalid limit (non-integer)', async () => {
      const response = await request(app)
        .get('/api/match/history?limit=abc')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('số nguyên');
    });

    it('should return 400 for invalid limit (negative)', async () => {
      const response = await request(app)
        .get('/api/match/history?limit=-5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('dương');
    });

    it('should return 400 for invalid limit (zero)', async () => {
      const response = await request(app)
        .get('/api/match/history?limit=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('dương');
    });

    it('should return empty array when no match history', async () => {
      matchService.getMatchHistory.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/match/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle server error gracefully', async () => {
      matchService.getMatchHistory.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/match/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Lỗi');
    });
  });
});