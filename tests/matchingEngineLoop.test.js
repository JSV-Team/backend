// Mock dependencies BEFORE requiring the module under test
const mockFindBestMatch = jest.fn();

jest.mock('../src/services/queueService', () => ({
  getQueueInfo: jest.fn(),
  getUserFromQueue: jest.fn(),
  cancelQueue: jest.fn()
}));

jest.mock('../src/services/matchEngine', () => {
  return jest.fn().mockImplementation(() => ({
    findBestMatch: mockFindBestMatch
  }));
});

jest.mock('../src/services/matchService', () => ({
  createMatchSession: jest.fn(),
  createConversation: jest.fn()
}));

jest.mock('../src/config/db', () => {
  const mockQuery = jest.fn();
  return {
    getPool: jest.fn(() => ({ query: mockQuery })),
    __mockQuery: mockQuery
  };
});

const matchingEngineLoop = require('../src/services/matchingEngineLoop');
const queueService = require('../src/services/queueService');
const matchService = require('../src/services/matchService');

describe('Matching Engine Loop', () => {
  let mockIo;
  let mockSocket1;
  let mockSocket2;

  beforeEach(() => {
    // Clear any existing interval
    matchingEngineLoop.stopMatchingEngine();
    jest.clearAllMocks();

    // Create mock socket objects
    mockSocket1 = {
      emit: jest.fn()
    };
    mockSocket2 = {
      emit: jest.fn()
    };

    // Create mock io with to() method returning socket
    mockIo = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    };
  });

  afterEach(() => {
    // Ensure engine is stopped after each test
    matchingEngineLoop.stopMatchingEngine();
    jest.clearAllMocks();
  });

  describe('startMatchingEngine', () => {
    test('should start the matching engine and run initial matching cycle', () => {
      // Mock queue to have less than 2 users (no match possible)
      queueService.getQueueInfo.mockReturnValue({
        success: true,
        data: {
          size: 1,
          users: [{ userId: 1, joinedAt: new Date() }]
        }
      });

      matchingEngineLoop.startMatchingEngine(mockIo);

      // Verify engine is running
      const status = matchingEngineLoop.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.intervalMs).toBe(2000);

      // Verify queue was checked
      expect(queueService.getQueueInfo).toHaveBeenCalled();
    });

    test('should not start if already running', () => {
      queueService.getQueueInfo.mockReturnValue({
        success: true,
        data: { size: 0, users: [] }
      });

      matchingEngineLoop.startMatchingEngine(mockIo);
      matchingEngineLoop.startMatchingEngine(mockIo);

      const status = matchingEngineLoop.getStatus();
      expect(status.isRunning).toBe(true);
    });
  });

  describe('stopMatchingEngine', () => {
    test('should stop the matching engine', () => {
      queueService.getQueueInfo.mockReturnValue({
        success: true,
        data: { size: 0, users: [] }
      });

      matchingEngineLoop.startMatchingEngine(mockIo);
      expect(matchingEngineLoop.getStatus().isRunning).toBe(true);

      matchingEngineLoop.stopMatchingEngine();

      expect(matchingEngineLoop.getStatus().isRunning).toBe(false);
    });

    test('should handle stop when not running', () => {
      // Should not throw
      expect(() => {
        matchingEngineLoop.stopMatchingEngine();
      }).not.toThrow();
    });
  });

  describe('Matching cycle with matches', () => {
    test('should find matches and emit events when 2+ users in queue', async () => {
      const user1Id = 1;
      const user2Id = 2;
      const conversationId = 100;
      const matchId = 200;

      // Create mock socket objects to track emit calls
      const mockSocket1 = { emit: jest.fn() };
      const mockSocket2 = { emit: jest.fn() };
      
      // Create mock io that returns specific sockets
      const mockIoInstance = {
        to: jest.fn((socketId) => {
          if (socketId === 'socket1') return mockSocket1;
          if (socketId === 'socket2') return mockSocket2;
          return { emit: jest.fn() };
        })
      };

      // Reset all mocks first
      jest.clearAllMocks();

      // Mock queue with 2 users
      queueService.getQueueInfo.mockReturnValue({
        success: true,
        data: {
          size: 2,
          users: [
            { userId: user1Id, joinedAt: new Date() },
            { userId: user2Id, joinedAt: new Date() }
          ]
        }
      });

      // Mock getUserFromQueue to return full user data (use fn() to always return)
      queueService.getUserFromQueue.mockImplementation((userId) => {
        if (userId === user1Id) {
          return {
            userId: user1Id,
            socketId: 'socket1',
            userInfo: {
              user_id: user1Id,
              username: 'user1',
              full_name: 'User One',
              avatar_url: 'http://example.com/avatar1.jpg',
              bio: 'Bio 1'
            }
          };
        }
        if (userId === user2Id) {
          return {
            userId: user2Id,
            socketId: 'socket2',
            userInfo: {
              user_id: user2Id,
              username: 'user2',
              full_name: 'User Two',
              avatar_url: 'http://example.com/avatar2.jpg',
              bio: 'Bio 2'
            }
          };
        }
        return null;
      });

      // Mock matchEngine.findBestMatch
      mockFindBestMatch.mockResolvedValue({
        user1Id: user1Id,
        user2Id: user2Id,
        score: 85.5,
        commonInterests: [{ interest_id: 1, name: 'Music' }]
      });

      // Mock matchService
      matchService.createMatchSession.mockResolvedValue({ match_id: matchId });
      matchService.createConversation.mockResolvedValue(conversationId);
      queueService.cancelQueue.mockReturnValue({ success: true });

      // Start the engine to set the io instance, then run matching cycle
      matchingEngineLoop.startMatchingEngine(mockIoInstance);
      await matchingEngineLoop.runMatchingCycle();

      // Verify match engine was called
      expect(mockFindBestMatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ userId: user1Id }),
          expect.objectContaining({ userId: user2Id })
        ])
      );

      // Verify match session was created
      expect(matchService.createMatchSession).toHaveBeenCalledWith(
        user1Id,
        user2Id,
        'interest'
      );

      // Verify conversation was created
      expect(matchService.createConversation).toHaveBeenCalledWith(
        user1Id,
        user2Id
      );

      // Verify users were removed from queue
      expect(queueService.cancelQueue).toHaveBeenCalledWith(user1Id);
      expect(queueService.cancelQueue).toHaveBeenCalledWith(user2Id);

      // Verify socket events were emitted
      expect(mockSocket1.emit).toHaveBeenCalledWith('match:found', expect.objectContaining({
        matchId: matchId,
        conversationId: conversationId
      }));
      expect(mockSocket2.emit).toHaveBeenCalledWith('match:found', expect.objectContaining({
        matchId: matchId,
        conversationId: conversationId
      }));
    });

    test('should not match when less than 2 users in queue', async () => {
      queueService.getQueueInfo.mockReturnValue({
        success: true,
        data: {
          size: 1,
          users: [{ userId: 1, joinedAt: new Date() }]
        }
      });

      await matchingEngineLoop.runMatchingCycle();

      expect(matchService.createMatchSession).not.toHaveBeenCalled();
      expect(matchService.createConversation).not.toHaveBeenCalled();
    });

    test('should not match when no valid match found', async () => {
      queueService.getQueueInfo.mockReturnValue({
        success: true,
        data: {
          size: 2,
          users: [
            { userId: 1, joinedAt: new Date() },
            { userId: 2, joinedAt: new Date() }
          ]
        }
      });

      // Mock matchEngine to return null (no valid match)
      mockFindBestMatch.mockResolvedValue(null);

      await matchingEngineLoop.runMatchingCycle();

      expect(mockFindBestMatch).toHaveBeenCalled();
      expect(matchService.createMatchSession).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    test('should handle errors gracefully during matching cycle', async () => {
      // Mock queue to throw error
      queueService.getQueueInfo.mockImplementation(() => {
        throw new Error('Queue error');
      });

      // Should not throw
      await expect(matchingEngineLoop.runMatchingCycle()).resolves.not.toThrow();
    });

    test('should handle match engine errors', async () => {
      queueService.getQueueInfo.mockReturnValue({
        success: true,
        data: {
          size: 2,
          users: [
            { userId: 1, joinedAt: new Date() },
            { userId: 2, joinedAt: new Date() }
          ]
        }
      });

      // Mock matchEngine to throw error
      mockFindBestMatch.mockRejectedValue(new Error('Match engine error'));

      // Should not throw
      await expect(matchingEngineLoop.runMatchingCycle()).resolves.not.toThrow();
    });

    test('should handle match service errors', async () => {
      const user1Id = 1;
      const user2Id = 2;

      queueService.getQueueInfo.mockReturnValue({
        success: true,
        data: {
          size: 2,
          users: [
            { userId: user1Id, joinedAt: new Date() },
            { userId: user2Id, joinedAt: new Date() }
          ]
        }
      });

      queueService.getUserFromQueue
        .mockReturnValueOnce({
          userId: user1Id,
          socketId: 'socket1',
          userInfo: { user_id: user1Id, username: 'user1' }
        })
        .mockReturnValueOnce({
          userId: user2Id,
          socketId: 'socket2',
          userInfo: { user_id: user2Id, username: 'user2' }
        });

      mockFindBestMatch.mockResolvedValue({
        user1Id,
        user2Id,
        score: 85,
        commonInterests: []
      });

      // Mock matchService to throw error
      matchService.createMatchSession.mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw
      await expect(matchingEngineLoop.runMatchingCycle()).resolves.not.toThrow();
    });

    test('should handle missing user data from queue', async () => {
      const user1Id = 1;
      const user2Id = 2;

      queueService.getQueueInfo.mockReturnValue({
        success: true,
        data: {
          size: 2,
          users: [
            { userId: user1Id, joinedAt: new Date() },
            { userId: user2Id, joinedAt: new Date() }
          ]
        }
      });

      mockFindBestMatch.mockResolvedValue({
        user1Id,
        user2Id,
        score: 85,
        commonInterests: []
      });

      // Mock getUserFromQueue to return null for user1
      queueService.getUserFromQueue
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({
          userId: user2Id,
          socketId: 'socket2',
          userInfo: { user_id: user2Id, username: 'user2' }
        });

      await matchingEngineLoop.runMatchingCycle();

      // Should not create match when user data is missing
      expect(matchService.createMatchSession).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    test('should return correct status when running', () => {
      queueService.getQueueInfo.mockReturnValue({
        success: true,
        data: { size: 0, users: [] }
      });

      matchingEngineLoop.startMatchingEngine(mockIo);

      const status = matchingEngineLoop.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.intervalMs).toBe(2000);
      expect(status.queueInfo).toBeDefined();
    });

    test('should return correct status when stopped', () => {
      const status = matchingEngineLoop.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.intervalMs).toBe(2000);
    });
  });
});