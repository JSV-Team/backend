const interestService = require('../src/services/interestService');

// Mock the database pool
jest.mock('../src/config/db', () => {
  const mockQuery = jest.fn();
  return {
    pool: {
      query: mockQuery
    },
    __mockQuery: mockQuery
  };
});

const { pool, __mockQuery } = require('../src/config/db');

describe('Interest Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserInterests', () => {
    const validUserId = 1;
    const mockInterests = [
      { interest_id: 1, name: 'Music' },
      { interest_id: 2, name: 'Sports' }
    ];

    test('should return interests for valid user', async () => {
      __mockQuery.mockResolvedValue({ rows: mockInterests });

      const result = await interestService.getUserInterests(validUserId);

      expect(result).toEqual(mockInterests);
      expect(__mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT i.interest_id, i.name'),
        [validUserId]
      );
    });

    test('should return empty array for user with no interests', async () => {
      __mockQuery.mockResolvedValue({ rows: [] });

      const result = await interestService.getUserInterests(validUserId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test('should return empty array for invalid user (non-existent)', async () => {
      __mockQuery.mockResolvedValue({ rows: [] });

      const result = await interestService.getUserInterests(99999);

      expect(result).toEqual([]);
    });
  });

  describe('getCommonInterests', () => {
    test('should return common interests between two users', async () => {
      const userId1 = 1;
      const userId2 = 2;
      const commonInterests = [
        { interest_id: 1, name: 'Music' }
      ];

      __mockQuery.mockResolvedValue({ rows: commonInterests });

      const result = await interestService.getCommonInterests(userId1, userId2);

      expect(result).toEqual(commonInterests);
      expect(__mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT i.interest_id, i.name'),
        [userId1, userId2]
      );
    });

    test('should return empty array when no common interests', async () => {
      const userId1 = 1;
      const userId2 = 2;

      __mockQuery.mockResolvedValue({ rows: [] });

      const result = await interestService.getCommonInterests(userId1, userId2);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateInterestScore', () => {
    test('should calculate score with common interests', async () => {
      const userId1 = 1;
      const userId2 = 2;

      // User 1 has interests: 1, 2, 3
      // User 2 has interests: 2, 3, 4
      // Common: 2, 3 (2 interests)
      // Unique: 1, 2, 3, 4 (4 interests)
      // Score: 2/4 * 100 = 50

      __mockQuery
        .mockResolvedValueOnce({ rows: [
          { interest_id: 1, name: 'Music' },
          { interest_id: 2, name: 'Sports' },
          { interest_id: 3, name: 'Gaming' }
        ]})
        .mockResolvedValueOnce({ rows: [
          { interest_id: 2, name: 'Sports' },
          { interest_id: 3, name: 'Gaming' },
          { interest_id: 4, name: 'Reading' }
        ]});

      const result = await interestService.calculateInterestScore(userId1, userId2);

      expect(result).toBe(50);
    });

    test('should return 0 when both users have no interests', async () => {
      const userId1 = 1;
      const userId2 = 2;

      __mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await interestService.calculateInterestScore(userId1, userId2);

      expect(result).toBe(0);
    });

    test('should return 0 when one user has no interests', async () => {
      const userId1 = 1;
      const userId2 = 2;

      __mockQuery
        .mockResolvedValueOnce({ rows: [{ interest_id: 1, name: 'Music' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await interestService.calculateInterestScore(userId1, userId2);

      expect(result).toBe(0);
    });

    test('should return 100 when users have identical interests', async () => {
      const userId1 = 1;
      const userId2 = 2;
      const sameInterests = [
        { interest_id: 1, name: 'Music' },
        { interest_id: 2, name: 'Sports' }
      ];

      __mockQuery
        .mockResolvedValueOnce({ rows: sameInterests })
        .mockResolvedValueOnce({ rows: sameInterests });

      const result = await interestService.calculateInterestScore(userId1, userId2);

      expect(result).toBe(100);
    });

    test('should return 0 when users have no overlapping interests', async () => {
      const userId1 = 1;
      const userId2 = 2;

      __mockQuery
        .mockResolvedValueOnce({ rows: [{ interest_id: 1, name: 'Music' }] })
        .mockResolvedValueOnce({ rows: [{ interest_id: 2, name: 'Sports' }] });

      const result = await interestService.calculateInterestScore(userId1, userId2);

      expect(result).toBe(0);
    });

    test('should round score to 2 decimal places', async () => {
      const userId1 = 1;
      const userId2 = 2;

      // User 1: interests 1, 2
      // User 2: interests 1, 2, 3
      // Common: 1, 2 (2 interests)
      // Unique: 1, 2, 3 (3 interests)
      // Score: 2/3 * 100 = 66.666...
      // Rounded: 66.67

      __mockQuery
        .mockResolvedValueOnce({ rows: [
          { interest_id: 1, name: 'Music' },
          { interest_id: 2, name: 'Sports' }
        ]})
        .mockResolvedValueOnce({ rows: [
          { interest_id: 1, name: 'Music' },
          { interest_id: 2, name: 'Sports' },
          { interest_id: 3, name: 'Gaming' }
        ]});

      const result = await interestService.calculateInterestScore(userId1, userId2);

      expect(result).toBe(66.67);
    });
  });
});