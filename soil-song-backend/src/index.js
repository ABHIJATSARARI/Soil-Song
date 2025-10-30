const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config();

// Import routes
const soilRoutes = require('./routes/soilRoutes');

// Import config
const { logger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;


// Create necessary directories if they don't exist
const audioDir = path.join(__dirname, '../', process.env.AUDIO_STORAGE_PATH);
const uploadsDir = path.join(__dirname, '../', process.env.UPLOAD_PATH);

[audioDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Security middleware - modify for development
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

// Get the local IP address for mobile testing
const getLocalIpAddress = () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
};

// Get all local IP addresses
const localIps = getLocalIpAddress();
logger.info(`Local IP addresses for mobile testing: ${localIps.join(', ')}`);

// CORS configuration - Allow all origins in development mode
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: eval(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting to all requests
app.use(limiter);

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(bodyParser.json({ limit: '5mb' })); // Increased limit for base64 images
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use('/audio', express.static(path.join(__dirname, '../', process.env.AUDIO_STORAGE_PATH)));
app.use('/uploads', express.static(path.join(__dirname, '../', process.env.UPLOAD_PATH)));

// API routes
app.use('/api', soilRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    localIps
  });
});

// Handle 404s
app.use((req, res, next) => {
  res.status(404).send({ error: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack);
  
  res.status(err.status || 500).send({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    }
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  logger.info(`Local: http://localhost:${PORT}`);
  localIps.forEach(ip => {
    logger.info(`On Your Network: http://${ip}:${PORT}`);
  });
});

module.exports = app;