const matchService = require('../src/services/matchService');
const chatModel = require('../src/models/chat.model');

// Mock the database pool
jest.mock('../src/config/db', () => {
  const mockQuery = jest.fn();
  return {
    getPool: jest.fn(() => ({
      query: mockQuery
    })),
    __mockQuery: mockQuery
  };
});

// Mock the chat model
jest.mock('../src/models/chat.model');

const { getPool, __mockQuery } = require('../src/config/db');

describe('Match Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMatchSession', () => {
    const validUserOne = 1;
    const validUserTwo = 2;
    const mockMatchSession = {
      match_id: 1,
      user_one: 1,
      user_two: 2,
      match_type: 'interest',
      status: 'active',
      created_at: new Date()
    };

    test('should create match session with valid users', async () => {
      __mockQuery.mockResolvedValue({ rows: [mockMatchSession] });

      const result = await matchService.createMatchSession(validUserOne, validUserTwo);

      expect(result).toEqual(mockMatchSession);
      expect(__mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO match_sessions'),
        [1, 2, 'interest']
      );
    });

    test('should create match session with custom match type', async () => {
      __mockQuery.mockResolvedValue({ rows: [mockMatchSession] });

      const result = await matchService.createMatchSession(validUserOne, validUserTwo, 'friend');

      expect(result).toEqual(mockMatchSession);
      expect(__mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO match_sessions'),
        [1, 2, 'friend']
      );
    });

    test('should throw error when matching same user', async () => {
      await expect(
        matchService.createMatchSession(validUserOne, validUserOne)
      ).rejects.toThrow('Không thể ghép đôi với chính mình');
    });

    test('should sort users so user_one is always smaller', async () => {
      __mockQuery.mockResolvedValue({ rows: [mockMatchSession] });

      // Pass userTwo first, then userOne
      await matchService.createMatchSession(validUserTwo, validUserOne);

      // Should be sorted so smaller ID is first
      expect(__mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [1, 2, 'interest']
      );
    });

    test('should handle negative user IDs', async () => {
      const mockNegativeMatch = { ...mockMatchSession, user_one: -2, user_two: -1 };
      __mockQuery.mockResolvedValue({ rows: [mockNegativeMatch] });

      const result = await matchService.createMatchSession(-1, -2);

      expect(result).toEqual(mockNegativeMatch);
      expect(__mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [-2, -1, 'interest']
      );
    });
  });

  describe('createConversation', () => {
    const userOneId = 1;
    const userTwoId = 2;
    const mockConversationId = 123;

    beforeEach(() => {
      chatModel.createConversation.mockResolvedValue(mockConversationId);
      chatModel.addMember.mockResolvedValue();
    });

    test('should create conversation with valid users', async () => {
      const result = await matchService.createConversation(userOneId, userTwoId);

      expect(result).toBe(mockConversationId);
      expect(chatModel.createConversation).toHaveBeenCalledWith('private', null);
      expect(chatModel.addMember).toHaveBeenCalledTimes(2);
      expect(chatModel.addMember).toHaveBeenCalledWith(mockConversationId, userOneId, 'member');
      expect(chatModel.addMember).toHaveBeenCalledWith(mockConversationId, userTwoId, 'member');
    });

    test('should throw error when creating conversation with same user', async () => {
      await expect(
        matchService.createConversation(userOneId, userOneId)
      ).rejects.toThrow('Không thể tạo cuộc trò chuyện với chính mình');
    });

    test('should handle users in different order', async () => {
      const result = await matchService.createConversation(userTwoId, userOneId);

      expect(result).toBe(mockConversationId);
      expect(chatModel.addMember).toHaveBeenCalledWith(mockConversationId, userTwoId, 'member');
      expect(chatModel.addMember).toHaveBeenCalledWith(mockConversationId, userOneId, 'member');
    });
  });

  describe('getMatchHistory', () => {
    const userId = 1;
    const defaultLimit = 20;
    const mockMatchHistory = [
      {
        match_id: 1,
        user_one: 1,
        user_two: 2,
        match_type: 'interest',
        status: 'active',
        created_at: new Date(),
        matched_user_id: 2,
        matched_username: 'user2',
        matched_full_name: 'User Two',
        matched_avatar_url: 'http://example.com/avatar2.jpg',
        matched_bio: 'Bio for user 2'
      },
      {
        match_id: 2,
        user_one: 3,
        user_two: 1,
        match_type: 'friend',
        status: 'active',
        created_at: new Date(),
        matched_user_id: 3,
        matched_username: 'user3',
        matched_full_name: 'User Three',
        matched_avatar_url: 'http://example.com/avatar3.jpg',
        matched_bio: 'Bio for user 3'
      }
    ];

    test('should return match history for valid user', async () => {
      __mockQuery.mockResolvedValue({ rows: mockMatchHistory });

      const result = await matchService.getMatchHistory(userId);

      expect(result).toEqual(mockMatchHistory);
      expect(__mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId, defaultLimit]
      );
    });

    test('should return match history with custom limit', async () => {
      const customLimit = 5;
      __mockQuery.mockResolvedValue({ rows: [mockMatchHistory[0]] });

      const result = await matchService.getMatchHistory(userId, customLimit);

      expect(result).toHaveLength(1);
      expect(__mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [userId, customLimit]
      );
    });

    test('should return empty array when user has no match history', async () => {
      __mockQuery.mockResolvedValue({ rows: [] });

      const result = await matchService.getMatchHistory(userId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test('should return empty array for non-existent user', async () => {
      __mockQuery.mockResolvedValue({ rows: [] });

      const result = await matchService.getMatchHistory(99999);

      expect(result).toEqual([]);
    });

    test('should use default limit when not provided', async () => {
      __mockQuery.mockResolvedValue({ rows: [] });

      await matchService.getMatchHistory(userId);

      expect(__mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [userId, 20]
      );
    });

    test('should handle limit of 0', async () => {
      __mockQuery.mockResolvedValue({ rows: [] });

      const result = await matchService.getMatchHistory(userId, 0);

      expect(result).toEqual([]);
      expect(__mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [userId, 0]
      );
    });
  });

  describe('getUserInfo', () => {
    const validUserId = 1;
    const mockUserInfo = {
      user_id: 1,
      username: 'testuser',
      full_name: 'Test User',
      avatar_url: 'http://example.com/avatar.jpg',
      bio: 'Test bio'
    };

    test('should return user info for valid user', async () => {
      __mockQuery.mockResolvedValue({ rows: [mockUserInfo] });

      const result = await matchService.getUserInfo(validUserId);

      expect(result).toEqual(mockUserInfo);
      expect(__mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT user_id, username'),
        [validUserId]
      );
    });

    test('should return null for non-existent user', async () => {
      __mockQuery.mockResolvedValue({ rows: [] });

      const result = await matchService.getUserInfo(99999);

      expect(result).toBeNull();
    });

    test('should return null for inactive user', async () => {
      __mockQuery.mockResolvedValue({ rows: [] });

      const result = await matchService.getUserInfo(validUserId);

      // Query includes status = 'active' condition
      expect(result).toBeNull();
    });

    test('should handle negative user ID', async () => {
      __mockQuery.mockResolvedValue({ rows: [] });

      const result = await matchService.getUserInfo(-1);

      expect(result).toBeNull();
      expect(__mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [-1]
      );
    });
  });
});