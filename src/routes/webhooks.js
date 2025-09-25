const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

// HubSpot webhook endpoint
router.post('/hubspot', webhookController.handleHubSpotWebhook);

// Webhook statistics and status
router.get('/stats', webhookController.getWebhookStats);

// Real-time contact counts
router.get('/realtime-counts', webhookController.getRealtimeCounts);

// Webhook configuration info
router.get('/config', webhookController.getWebhookConfig);

module.exports = router;