const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const path = require('path');

const compression = require('compression');

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const { generalLimiter, authLimiter, registerLimiter } = require('./middlewares/rateLimiter');
app.use('/api', generalLimiter);
app.use('/api/login', authLimiter);
app.use('/api/auth/register', registerLimiter);

// Middleware
app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CLIENT_URL || '').split(',').map(o => o.trim()).filter(Boolean);
    
    console.log(`[CORS] Origin: ${origin}, Allowed: ${allowed.join(', ')}, NODE_ENV: ${process.env.NODE_ENV}`);
    
    // In production, allow configured origins + no origin (for server-to-server)
    if (process.env.NODE_ENV === 'production') {
      // Allow requests with no origin (mobile apps, server-to-server, Postman)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowed.length > 0 && allowed.includes(origin)) {
        return callback(null, true);
      }
      
      // If no CLIENT_URL configured, allow all (fallback for deployment)
      if (allowed.length === 0) {
        console.warn('[CORS] No CLIENT_URL configured, allowing all origins');
        return callback(null, true);
      }
      
      console.error(`[CORS] Origin '${origin}' not in allowed list: ${allowed.join(', ')}`);
      return callback(new Error(`CORS: Origin '${origin}' not allowed`));
    }
    
    // In development, allow localhost and configured origins
    if (!origin || allowed.includes(origin) || 
        (origin && (origin.includes('localhost') || origin.includes('127.0.0.1')))) {
      return callback(null, true);
    }
    
    return callback(new Error(`CORS: Origin '${origin}' not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-user-id', 'x-requested-with'],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve file upload tĩnh
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Debug middleware - Log to console in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Routes
app.use('/api', routes);

// 404 Handler for API
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API Route ${req.method} ${req.originalUrl} not found` });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to JSV API', 
    version: '1.0.0', 
    status: 'online'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);

  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: err.message || 'Lỗi upload file'
    });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.toString() : undefined
  });
});

module.exports = app;

