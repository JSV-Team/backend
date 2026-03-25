const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const path = require('path');

const compression = require('compression');

const app = express();

// Trust proxy - important for Render, Heroku, etc to get correct protocol/host
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Disable CSP for uploads to allow cross-origin image loading
app.use('/uploads', (req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  next();
});

// Rate limiting - TEMPORARILY DISABLED FOR DEBUGGING
// const { generalLimiter, authLimiter, registerLimiter } = require('./middlewares/rateLimiter');
// app.use('/api', generalLimiter);
// app.use('/api/login', authLimiter);
// app.use('/api/auth/register', registerLimiter);

// Middleware
app.use(compression());
// CORS - Simple configuration that works
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-user-id, x-requested-with');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Additional CORS headers for file uploads
app.use('/api/upload', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-user-id, x-requested-with');
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve file upload tĩnh với CORS headers
app.use('/uploads', (req, res, next) => {
  // CORS headers for cross-origin image loading
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, path) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Debug middleware - Log to console in development
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin}`);
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

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

