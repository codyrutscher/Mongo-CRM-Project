const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // Use RAILWAY_MONGODB_URI if MONGODB_URI is not set (for Railway deployment)
    const mongoUri = process.env.MONGODB_URI || process.env.RAILWAY_MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('No MongoDB URI found in environment variables');
    }
    
    const conn = await mongoose.connect(mongoUri);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDB;