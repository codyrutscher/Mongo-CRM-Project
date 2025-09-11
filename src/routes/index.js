const express = require('express');
const contactRoutes = require('./contacts');
const syncRoutes = require('./sync');
const exportRoutes = require('./export');
const csvRoutes = require('./csv');
const segmentRoutes = require('./segments');
const webhookRoutes = require('./webhooks');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ProspereCRM API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
router.use('/contacts', contactRoutes);
router.use('/sync', syncRoutes);
router.use('/export', exportRoutes);
router.use('/csv', csvRoutes);
router.use('/segments', segmentRoutes);
router.use('/webhooks', webhookRoutes);

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