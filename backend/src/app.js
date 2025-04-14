const express = require('express');

const cors = require('cors');
const compression = require('compression');

const cookieParser = require('cookie-parser');

const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');

const errorHandlers = require('./handlers/errorHandlers');
const erpApiRouter = require('./routes/appRoutes/appApi');

const fileUpload = require('express-fileupload');
// create our Express app
const app = express();

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Get allowed origins list (from environment variable or use default)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [
      'http://localhost:3000',
      'http://frontend:3000',
      // Use regular expressions to match any domain or IP
      /^https?:\/\/[a-zA-Z0-9-_\.]+:\d+$/,  // Match any domain or IP with a port
      /^https?:\/\/[a-zA-Z0-9-_\.]+$/       // Match any domain or IP without a port
    ];

console.log('Allowed CORS origins:', allowedOrigins);

// Set up CORS with more specific options
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(compression());

// Use file upload middleware
app.use(fileUpload());

// Simple health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Public settings endpoint for debugging
app.get('/debug/settings', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Model = mongoose.model('Setting');
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        result: [],
        message: 'Database not connected',
        dbState: mongoose.connection.readyState
      });
    }
    
    const result = await Model.find({
      removed: false,
      isPrivate: false,
    });
    
    return res.status(200).json({
      success: true,
      result,
      message: 'Debug settings',
      dbState: mongoose.connection.readyState
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Here our API Routes
app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// production error handler
app.use(errorHandlers.productionErrors);

// done! we export it so we can start the site in start.js
module.exports = app;
