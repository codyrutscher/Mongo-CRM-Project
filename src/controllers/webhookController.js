const webhookService = require('../services/webhookService');
const logger = require('../utils/logger');

class WebhookController {
  async handleHubSpotWebhook(req, res) {
    try {
      const signature = req.headers['x-hubspot-signature'];
      const timestamp = req.headers['x-hubspot-request-timestamp'];
      const body = JSON.stringify(req.body);

      // Verify webhook signature (disabled for now)
      if (false && process.env.NODE_ENV === 'production' && signature) {
        const isValid = webhookService.verifyHubSpotSignature(body, signature, timestamp);
        if (!isValid) {
          logger.warn('Invalid webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      // Process the webhook data
      const result = await webhookService.processHubSpotWebhook(req.body);
      
      // Respond quickly to HubSpot
      res.status(200).json({
        success: true,
        message: result.message,
        processed: result.processed
      });

      logger.info(`HubSpot webhook processed: ${result.message}`);

    } catch (error) {
      logger.error('Error processing HubSpot webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed'
      });
    }
  }

  async getWebhookStats(req, res) {
    try {
      const stats = await webhookService.getWebhookStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting webhook stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get webhook statistics'
      });
    }
  }

  async getRealtimeCounts(req, res) {
    try {
      const counts = await webhookService.getRealtimeSegmentCounts();
      
      res.json({
        success: true,
        data: counts
      });
    } catch (error) {
      logger.error('Error getting realtime counts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get realtime counts'
      });
    }
  }

  // Webhook configuration helper
  async getWebhookConfig(req, res) {
    try {
      const config = {
        webhookUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/webhooks/hubspot`,
        supportedEvents: [
          'contact.creation',
          'contact.deletion', 
          'contact.propertyChange'
        ],
        setupInstructions: [
          '1. Go to HubSpot Developer Account',
          '2. Open your app settings',
          '3. Navigate to Webhooks tab',
          '4. Add the webhook URL above',
          '5. Subscribe to contact events',
          '6. Test the webhook'
        ],
        currentStatus: process.env.HUBSPOT_WEBHOOK_SECRET ? 'configured' : 'not_configured'
      };
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('Error getting webhook config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get webhook configuration'
      });
    }
  }
}

module.exports = new WebhookController();