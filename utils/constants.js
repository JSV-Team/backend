/**
 * Constants for the interest-based matching feature
 * All time values are in milliseconds unless otherwise specified
 */

// Queue timeout - 120 seconds (from requirements)
const QUEUE_TIMEOUT_MS = process.env.QUEUE_TIMEOUT_MS || 120000;

// Matching engine runs every 2 seconds (from requirements)
const MATCHING_INTERVAL_MS = process.env.MATCHING_INTERVAL_MS || 2000;

// Minimum interest score threshold (minimum 1 common interest)
const MIN_INTEREST_SCORE = 0;

// Maximum queue size (from requirements)
const MAX_QUEUE_SIZE = process.env.MAX_QUEUE_SIZE || 1000;

// Reconnect window - 30 seconds (from requirements)
const RECONNECT_WINDOW_MS = process.env.RECONNECT_WINDOW_MS || 30000;

// Queue update debounce - 5 seconds (from requirements)
const QUEUE_UPDATE_DEBOUNCE_MS = process.env.QUEUE_UPDATE_DEBOUNCE_MS || 5000;

// Heartbeat interval for client ping
const HEARTBEAT_INTERVAL_MS = 30000;

// Maximum wait time bonus in score calculation (120 seconds = max bonus)
const MAX_WAIT_TIME_BONUS_SECONDS = 120;

// Wait time bonus multiplier (10 points max bonus)
const WAIT_TIME_BONUS_MULTIPLIER = 10;

// Interest score calculation constants
const SCORE_PRECISION = 2; // Round to 2 decimal places

// Socket.IO configuration
const SOCKET_IO_CONFIG = {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
};

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;

// Cache TTL for user interests (5 minutes)
const USER_INTERESTS_CACHE_TTL_MS = 5 * 60 * 1000;

// Database connection pool settings
const DB_POOL_CONFIG = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};

module.exports = {
  // Queue timing
  QUEUE_TIMEOUT_MS,
  MATCHING_INTERVAL_MS,
  RECONNECT_WINDOW_MS,
  QUEUE_UPDATE_DEBOUNCE_MS,
  HEARTBEAT_INTERVAL_MS,

  // Queue limits
  MAX_QUEUE_SIZE,
  MIN_INTEREST_SCORE,

  // Score calculation
  MAX_WAIT_TIME_BONUS_SECONDS,
  WAIT_TIME_BONUS_MULTIPLIER,
  SCORE_PRECISION,

  // Socket.IO
  SOCKET_IO_CONFIG,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,

  // Cache
  USER_INTERESTS_CACHE_TTL_MS,

  // Database
  DB_POOL_CONFIG
};