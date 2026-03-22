const queueService = require('../src/services/queueService');

// Mock dependencies
let mockQuery;

jest.mock('../src/services/interestService', () => ({
  getUserInterests: jest.fn()
}));

jest.mock('../src/services/matchService', () => ({
  getUserInfo: jest.fn()
}));

jest.mock('../src/config/db', () => {
  mockQuery = jest.fn();
  return {
    getPool: jest.fn(() => ({ query: mockQuery }))
  };
});

const interestService = require('../src/services/interestService');
const matchService = require('../src/services/matchService');

describe('Queue Service', () => {
  let mockIo;

  // Helper to clear the queue - uses cancelQueue for each user
  const clearQueue = () => {
    const queueInfo = queueService.getQueueInfo();
    if (queueInfo.success && queueInfo.data.users) {
      const users = [...queueInfo.data.users]; // Copy to avoid mutation issues
      users.forEach(user => {
        queueService.cancelQueue(user.userId);
      });
    }
  };

  beforeAll(() => {
    // Clear queue before all tests
    clearQueue();
  });

  afterEach(() => {
    // Clear queue after each test
    clearQueue();
    jest.clearAllMocks();
  });

  describe('joinQueue', () => {
    const validUserId = 1;
    const validUserInfo = { socketId: 'socket123' };
    const mockUserInfo = {
      user_id: 1,
      username: 'testuser',
      full_name: 'Test User',
      avatar_url: 'http://example.com/avatar.jpg',
      bio: 'Test bio'
    };
    const mockInterests = [
      { interest_id: 1, name: 'Music' },
      { interest_id: 2, name: 'Sports' }
    ];

    test('should successfully join queue with valid user', async () => {
      clearQueue();
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: 'active' }] })
        .mockResolvedValueOnce({ rows: mockInterests });

      matchService.getUserInfo.mockResolvedValue(mockUserInfo);
      interestService.getUserInterests.mockResolvedValue(mockInterests);

      const result = await queueService.joinQueue(validUserId, validUserInfo);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('queueSize');
      expect(result.data).toHaveProperty('estimatedWaitTime');
      expect(result.data.message).toBe('Bạn đã tham gia hàng đợi');
      
      queueService.cancelQueue(validUserId);
    });

    test('should fail when user has no interests', async () => {
      clearQueue();
      
      matchService.getUserInfo.mockResolvedValue(mockUserInfo);
      mockQuery.mockResolvedValueOnce({ rows: [{ status: 'active' }] });
      interestService.getUserInterests.mockResolvedValue([]);

      const result = await queueService.joinQueue(validUserId, validUserInfo);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NO_INTERESTS');
      expect(result.error).toBe('Vui lòng thêm sở thích trước khi ghép đôi');
    });

    test('should fail when user is banned/inactive', async () => {
      clearQueue();
      
      matchService.getUserInfo.mockResolvedValue(mockUserInfo);
      mockQuery.mockResolvedValueOnce({ rows: [{ status: 'banned' }] });

      const result = await queueService.joinQueue(validUserId, validUserInfo);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('USER_BANNED');
      expect(result.error).toBe('Tài khoản của bạn đã bị khóa');
    });

    test('should fail when user does not exist', async () => {
      clearQueue();
      
      matchService.getUserInfo.mockResolvedValue(null);
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await queueService.joinQueue(validUserId, validUserInfo);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('USER_NOT_FOUND');
    });

    test('should fail when user is already in queue', async () => {
      clearQueue();
      
      matchService.getUserInfo
        .mockResolvedValueOnce(mockUserInfo)
        .mockResolvedValueOnce(mockUserInfo);
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: 'active' }] })
        .mockResolvedValueOnce({ rows: mockInterests });
      interestService.getUserInterests.mockResolvedValue(mockInterests);

      const firstResult = await queueService.joinQueue(validUserId, validUserInfo);
      expect(firstResult.success).toBe(true);

      const result = await queueService.joinQueue(validUserId, validUserInfo);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ALREADY_IN_QUEUE');
      expect(result.error).toBe('Bạn đang trong hàng đợi');
    });
  });

  describe('cancelQueue', () => {
    const validUserId = 100;
    const validUserInfo = { socketId: 'socket100' };
    const mockUserInfo = {
      user_id: 100,
      username: 'testuser100',
      full_name: 'Test User 100',
      avatar_url: 'http://example.com/avatar.jpg',
      bio: 'Test bio'
    };
    const mockInterests = [
      { interest_id: 1, name: 'Music' }
    ];

    test('should successfully cancel queue for existing user', async () => {
      clearQueue();
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: 'active' }] })
        .mockResolvedValueOnce({ rows: mockInterests });
      
      interestService.getUserInterests.mockResolvedValue(mockInterests);
      matchService.getUserInfo.mockResolvedValue(mockUserInfo);

      const joinResult = await queueService.joinQueue(validUserId, validUserInfo);
      expect(joinResult.success).toBe(true);
      expect(queueService.isUserInQueue(validUserId)).toBe(true);

      const result = queueService.cancelQueue(validUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Đã hủy tìm kiếm');
      expect(queueService.isUserInQueue(validUserId)).toBe(false);
    });

    test('should fail when user is not in queue', () => {
      clearQueue();
      
      const nonExistentUserId = 9999;
      const result = queueService.cancelQueue(nonExistentUserId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_IN_QUEUE');
      expect(result.error).toBe('Bạn không có trong hàng đợi');
    });
  });

  describe('getQueueInfo', () => {
    const validUserId = 200;
    const validUserInfo = { socketId: 'socket200' };
    const mockUserInfo = {
      user_id: 200,
      username: 'testuser200',
      full_name: 'Test User 200',
      avatar_url: 'http://example.com/avatar.jpg',
      bio: 'Test bio'
    };
    const mockInterests = [
      { interest_id: 1, name: 'Music' }
    ];

    test('should return queue info with users', async () => {
      clearQueue();
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: 'active' }] })
        .mockResolvedValueOnce({ rows: mockInterests });

      interestService.getUserInterests.mockResolvedValue(mockInterests);
      matchService.getUserInfo.mockResolvedValue(mockUserInfo);

      await queueService.joinQueue(validUserId, validUserInfo);

      const result = queueService.getQueueInfo();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('size');
      expect(result.data).toHaveProperty('maxSize');
      expect(result.data).toHaveProperty('users');
      expect(result.data).toHaveProperty('timeout');
      expect(result.data.size).toBeGreaterThan(0);
      expect(result.data.users).toHaveLength(1);
      expect(result.data.users[0].userId).toBe(validUserId);
    });

    test('should return empty queue info when queue is empty', () => {
      clearQueue();
      
      const result = queueService.getQueueInfo();

      expect(result.success).toBe(true);
      expect(result.data.size).toBe(0);
      expect(result.data.users).toEqual([]);
    });
  });

  describe('handleTimeout', () => {
    const mockUserInfo = {
      user_id: 1,
      username: 'testuser',
      full_name: 'Test User',
      avatar_url: 'http://example.com/avatar.jpg',
      bio: 'Test bio'
    };
    const mockInterests = [
      { interest_id: 1, name: 'Music' }
    ];

    test('should remove users who have timed out', async () => {
      clearQueue();
      
      const testUserId = 999;
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: 'active' }] })
        .mockResolvedValueOnce({ rows: mockInterests });

      interestService.getUserInterests.mockResolvedValue(mockInterests);
      matchService.getUserInfo.mockResolvedValue(mockUserInfo);

      await queueService.joinQueue(testUserId, { socketId: 'socket999' });

      const user = queueService.getUserFromQueue(testUserId);
      if (user) {
        user.joinedAt = new Date(Date.now() - 200 * 1000);
      }

      const result = queueService.handleTimeout(mockIo);

      expect(result).toContain(testUserId);
      expect(queueService.isUserInQueue(testUserId)).toBe(false);
    });

    test('should not remove users who have not timed out', async () => {
      clearQueue();
      
      const testUserId = 888;
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: 'active' }] })
        .mockResolvedValueOnce({ rows: mockInterests });

      interestService.getUserInterests.mockResolvedValue(mockInterests);
      matchService.getUserInfo.mockResolvedValue(mockUserInfo);

      await queueService.joinQueue(testUserId, { socketId: 'socket888' });

      const result = queueService.handleTimeout(mockIo);

      expect(result).not.toContain(testUserId);
      expect(queueService.isUserInQueue(testUserId)).toBe(true);
    });
  });

  describe('isUserInQueue', () => {
    const validUserId = 300;
    const validUserInfo = { socketId: 'socket300' };
    const mockUserInfo = {
      user_id: 300,
      username: 'testuser300',
      full_name: 'Test User 300',
      avatar_url: 'http://example.com/avatar.jpg',
      bio: 'Test bio'
    };
    const mockInterests = [
      { interest_id: 1, name: 'Music' }
    ];

    test('should return true for user in queue', async () => {
      clearQueue();
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: 'active' }] })
        .mockResolvedValueOnce({ rows: mockInterests });

      interestService.getUserInterests.mockResolvedValue(mockInterests);
      matchService.getUserInfo.mockResolvedValue(mockUserInfo);

      await queueService.joinQueue(validUserId, validUserInfo);

      expect(queueService.isUserInQueue(validUserId)).toBe(true);
    });

    test('should return false for user not in queue', () => {
      clearQueue();
      
      expect(queueService.isUserInQueue(9999)).toBe(false);
    });
  });

  describe('getUserFromQueue', () => {
    const validUserId = 400;
    const validUserInfo = { socketId: 'socket400' };
    const mockUserInfo = {
      user_id: 400,
      username: 'testuser400',
      full_name: 'Test User 400',
      avatar_url: 'http://example.com/avatar.jpg',
      bio: 'Test bio'
    };
    const mockInterests = [
      { interest_id: 1, name: 'Music' }
    ];

    test('should return user info for user in queue', async () => {
      clearQueue();
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: 'active' }] })
        .mockResolvedValueOnce({ rows: mockInterests });

      interestService.getUserInterests.mockResolvedValue(mockInterests);
      matchService.getUserInfo.mockResolvedValue(mockUserInfo);

      await queueService.joinQueue(validUserId, validUserInfo);

      const user = queueService.getUserFromQueue(validUserId);

      expect(user).not.toBeNull();
      expect(user.userId).toBe(validUserId);
      expect(user.interests).toEqual([1]);
    });

    test('should return null for user not in queue', () => {
      clearQueue();
      
      const user = queueService.getUserFromQueue(9999);
      expect(user).toBeNull();
    });
  });

  describe('resetUserTimeout', () => {
    const validUserId = 500;
    const validUserInfo = { socketId: 'socket500' };
    const mockUserInfo = {
      user_id: 500,
      username: 'testuser500',
      full_name: 'Test User 500',
      avatar_url: 'http://example.com/avatar.jpg',
      bio: 'Test bio'
    };
    const mockInterests = [
      { interest_id: 1, name: 'Music' }
    ];

    test('should reset timeout for user in queue', async () => {
      clearQueue();
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: 'active' }] })
        .mockResolvedValueOnce({ rows: mockInterests });

      interestService.getUserInterests.mockResolvedValue(mockInterests);
      matchService.getUserInfo.mockResolvedValue(mockUserInfo);

      await queueService.joinQueue(validUserId, validUserInfo);

      const userBefore = queueService.getUserFromQueue(validUserId);
      const oldJoinedAt = userBefore.joinedAt.getTime();

      await new Promise(resolve => setTimeout(resolve, 50));

      const result = queueService.resetUserTimeout(validUserId);

      expect(result).toBe(true);
      const userAfter = queueService.getUserFromQueue(validUserId);
      expect(userAfter.joinedAt.getTime()).toBeGreaterThanOrEqual(oldJoinedAt);
    });

    test('should return false for user not in queue', () => {
      clearQueue();
      
      const result = queueService.resetUserTimeout(9999);
      expect(result).toBe(false);
    });
  });
});
