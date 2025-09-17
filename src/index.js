require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/database');
const routes = require('./routes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// In production, verify React build exists
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.resolve(__dirname, '../react-frontend/build');
  const fs = require('fs');
  
  if (!fs.existsSync(buildPath)) {
    logger.error(`React build not found at: ${buildPath}`);
    logger.error('This may cause the app to fail. Build should have been created during deployment.');
  } else {
    logger.info(`✅ React build verified at: ${buildPath}`);
  }
}

// Connect to MongoDB
connectDB();

// Create 5 predefined users on startup
const createPredefinedUsers = async () => {
  try {
    const User = require('./models/User');
    
    const predefinedUsers = [
      {
        email: 'admin@prosperecrm.com',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      },
      {
        email: 'john@prosperecrm.com',
        password: 'John123!',
        firstName: 'John',
        lastName: 'Smith',
        role: 'user'
      },
      {
        email: 'sarah@prosperecrm.com',
        password: 'Sarah123!',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'user'
      },
      {
        email: 'mike@prosperecrm.com',
        password: 'Mike123!',
        firstName: 'Mike',
        lastName: 'Davis',
        role: 'user'
      },
      {
        email: 'lisa@prosperecrm.com',
        password: 'Lisa123!',
        firstName: 'Lisa',
        lastName: 'Wilson',
        role: 'user'
      }
    ];

    for (const userData of predefinedUsers) {
      const userExists = await User.findOne({ email: userData.email });
      if (!userExists) {
        const user = new User(userData);
        await user.save();
        logger.info(`✅ User created: ${userData.email} / ${userData.password}`);
      }
    }
  } catch (error) {
    logger.error('Error creating predefined users:', error);
  }
};

// Create predefined users after a short delay to ensure DB connection
setTimeout(createPredefinedUsers, 2000);

// Security middleware with relaxed CSP for development
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Increase timeout for large exports
app.use('/api/segments/:id/export', (req, res, next) => {
  req.setTimeout(10 * 60 * 1000); // 10 minutes for exports
  res.setTimeout(10 * 60 * 1000);
  next();
});

// Serve static files (for uploaded files, etc.)
app.use('/uploads', express.static('uploads'));
app.use('/exports', express.static('exports'));

// API routes
app.use('/api', routes);

// In production, serve React build files
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.resolve(__dirname, '../react-frontend/build');
  
  logger.info(`Serving React build from: ${buildPath}`);
  
  // Check if build directory exists, if not, wait for it or create a fallback
  const fs = require('fs');
  if (fs.existsSync(buildPath)) {
    logger.info(`Build directory exists: true`);
    
    // Serve static files with proper MIME types
    app.use(express.static(buildPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        }
      }
    }));
    
    // Handle React routing - serve index.html for non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  } else {
    logger.warn(`Build directory not found: ${buildPath}`);
    logger.warn('Serving API only - React build may still be in progress');
    
    // Fallback for when build doesn't exist yet
    app.get('*', (req, res) => {
      res.json({ 
        success: false, 
        message: 'React build not found - build may be in progress',
        buildPath: buildPath,
        timestamp: new Date().toISOString()
      });
    });
  }
} else {
  // Development - just serve API
  app.get('/', (req, res) => {
    res.json({ 
      success: true, 
      message: 'ProspereCRM API Server',
      frontend: 'Run React frontend on port 3000'
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field'
    });
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`ProspereCRM server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`🚀 ProspereCRM is running in production`);
    console.log(`🌐 Webhook URL: ${process.env.BASE_URL}/api/webhooks/hubspot`);
  } else {
    console.log(`🚀 ProspereCRM is running at http://localhost:${PORT}`);
  }
});

module.exports = app;