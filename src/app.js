const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const fs = require('fs');
const path = require('path');

const app = express();

// Setup file logging
const logFile = fs.createWriteStream(path.join(__dirname, 'debug.log'), { flags: 'a' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve file upload tĩnh
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Debug middleware - LOG ALL REQUESTS WITH STATUS
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const msg = `\n[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)\n`;
    console.log(msg);
    logFile.write(msg);
  });
  next();
});

// Routes
app.use('/api', routes);

// 404 Handler for API
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API Route ${req.method} ${req.originalUrl} not found` });
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to JSV API', version: '1.0.0', endpoints: { users: '/api/users', friends: '/api/friends', match: '/api/match', health: '/health', notifications:'/api/notifications' } });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const msg = `\n[ERROR] ${err.message}\n${err.stack}\n`;
  console.error(msg);
  logFile.write(msg);
  
  // Xử lý multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: err.message || 'Lỗi upload file',
      error: process.env.NODE_ENV === 'development' ? err.toString() : undefined
    });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.toString() : undefined
  });
});

module.exports = app;
