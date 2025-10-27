const express = require('express');
const contactRoutes = require('./contacts');
const syncRoutes = require('./sync');
const exportRoutes = require('./export');
const csvRoutes = require('./csv');
const segmentRoutes = require('./segments');
const authRoutes = require('./auth');
const webhookRoutes = require('./webhooks');
const responseGeniusRoutes = require('./responseGenius');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };

    res.json({
      success: true,
      message: 'ProspereCRM API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.1',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStates[dbStatus] || 'unknown',
        readyState: dbStatus
      },
      build: {
        buildExists: require('fs').existsSync(require('path').resolve(__dirname, '../../react-frontend/build'))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to check users
router.get('/debug/users', async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({}, 'email firstName lastName role isActive createdAt');
    
    res.json({
      success: true,
      data: {
        totalUsers: users.length,
        users: users
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API routes
router.use('/auth', authRoutes);
router.use('/contacts', contactRoutes);
router.use('/sync', syncRoutes);
router.use('/export', exportRoutes);
router.use('/csv', csvRoutes);
router.use('/segments', segmentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/response-genius', responseGeniusRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'ProspereCRM API',
    version: '1.0.0',
    description: 'A comprehensive CRM system integrating HubSpot, Google Sheets, and MongoDB',
    endpoints: {
      contacts: '/api/contacts',
      sync: '/api/sync',
      export: '/api/export',
      health: '/api/health'
    }
  });
});

module.exports = router;