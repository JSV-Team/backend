const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const path = require('path');

const compression = require('compression');

const app = express();

// Middleware
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-user-id']
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

