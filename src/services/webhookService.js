const Contact = require('../models/Contact');
const hubspotService = require('./hubspotService');
const logger = require('../utils/logger');
const crypto = require('crypto');

class WebhookService {
  constructor() {
    this.webhookSecret = process.env.HUBSPOT_WEBHOOK_SECRET || 'your-webhook-secret';
  }

  // Verify HubSpot webhook signature
  verifyHubSpotSignature(body, signature, timestamp) {
    try {
      const expectedSignature = crypto
        .createHash('sha256')
        .update(body + timestamp + this.webhookSecret)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  async processHubSpotWebhook(webhookData) {
    try {
      logger.info('Processing HubSpot webhook:', JSON.stringify(webhookData, null, 2));

      if (!webhookData || !webhookData.length) {
        return { message: 'No webhook data received' };
      }

      let processed = 0;
      let errors = 0;

      for (const event of webhookData) {
        try {
          await this.processWebhookEvent(event);
          processed++;
        } catch (error) {
          errors++;
          logger.error('Error processing webhook event:', error);
        }
      }

      return {
        message: `Processed ${processed} events with ${errors} errors`,
        processed,
        errors
      };
    } catch (error) {
      logger.error('Error in processHubSpotWebhook:', error);
      throw error;
    }
  }

  async processWebhookEvent(event) {
    // HubSpot webhook structure based on actual logs
    const subscriptionType = event.subscriptionType; // e.g., "contact.propertyChange"
    const objectId = event.objectId;
    const propertyName = event.propertyName;
    const propertyValue = event.propertyValue;
    const changeSource = event.changeSource;
    
    logger.info(`Event keys: ${Object.keys(event).join(', ')}`);
    logger.info(`Processing: ${subscriptionType} for contact ${objectId} (property: ${propertyName})`);

    // Parse subscription type to determine action
    if (subscriptionType && subscriptionType.includes('contact')) {
      if (subscriptionType === 'contact.creation') {
        await this.handleContactCreation(objectId);
      } else if (subscriptionType === 'contact.deletion') {
        await this.handleContactDeletion(objectId);
      } else if (subscriptionType === 'contact.propertyChange') {
        await this.handleContactUpdate(objectId, propertyName);
      } else {
        logger.warn(`Unknown subscription type: ${subscriptionType}`);
        // Default to contact update
        await this.handleContactUpdate(objectId, propertyName);
      }
    } else {
      logger.warn(`No valid subscription type found: ${subscriptionType}`);
    }
  }

  async handleContactCreation(hubspotContactId) {
    try {
      logger.info(`🆕 Creating contact from HubSpot: ${hubspotContactId}`);

      // Fetch the contact from HubSpot
      const hubspotContact = await this.fetchHubSpotContact(hubspotContactId);
      if (!hubspotContact) {
        logger.warn(`❌ Could not fetch contact ${hubspotContactId} from HubSpot`);
        return;
      }

      logger.info(`📋 Fetched contact data:`, JSON.stringify(hubspotContact, null, 2));

      // Transform and save
      const contactData = hubspotService.transformContactData(hubspotContact);
      logger.info(`🔄 Transformed contact data:`, JSON.stringify(contactData, null, 2));
      
      // Check if contact already exists
      const existingContact = await Contact.findOne({
        source: 'hubspot',
        sourceId: contactData.sourceId
      });

      if (!existingContact) {
        const contact = new Contact(contactData);
        await contact.save();
        logger.info(`✅ Created contact: ${contact.firstName} ${contact.lastName} (ID: ${contact._id})`);
      } else {
        logger.info(`ℹ️  Contact already exists: ${existingContact.firstName} ${existingContact.lastName} (ID: ${existingContact._id})`);
      }

    } catch (error) {
      logger.error('Error handling contact creation:', error);
    }
  }

  async handleContactUpdate(hubspotContactId, propertyName) {
    try {
      logger.info(`🔄 Updating contact from HubSpot: ${hubspotContactId} (${propertyName})`);

      // Fetch the updated contact from HubSpot
      const hubspotContact = await this.fetchHubSpotContact(hubspotContactId);
      if (!hubspotContact) return;

      // Transform data
      const contactData = hubspotService.transformContactData(hubspotContact);
      
      // Find existing contact
      const existingContact = await Contact.findOne({
        source: 'hubspot',
        sourceId: contactData.sourceId
      });

      if (existingContact) {
        // Update the contact
        Object.assign(existingContact, contactData);
        existingContact.lastSyncedAt = new Date();
        await existingContact.save();
        logger.info(`✅ Updated contact: ${existingContact.firstName} ${existingContact.lastName}`);
      } else {
        // Contact doesn't exist, create it
        const contact = new Contact(contactData);
        await contact.save();
        logger.info(`✅ Created missing contact: ${contact.firstName} ${contact.lastName}`);
      }

    } catch (error) {
      logger.error('Error handling contact update:', error);
    }
  }

  async handleContactDeletion(hubspotContactId) {
    try {
      logger.info(`🗑️  Deleting contact from HubSpot: ${hubspotContactId}`);

      // Find and mark contact as deleted
      const existingContact = await Contact.findOne({
        source: 'hubspot',
        sourceId: hubspotContactId
      });

      if (existingContact) {
        existingContact.status = 'deleted';
        existingContact.lastSyncedAt = new Date();
        await existingContact.save();
        logger.info(`✅ Marked contact as deleted: ${existingContact.firstName} ${existingContact.lastName}`);
      } else {
        logger.info(`ℹ️  Contact not found for deletion: ${hubspotContactId}`);
      }

    } catch (error) {
      logger.error('Error handling contact deletion:', error);
    }
  }

  async fetchHubSpotContact(contactId) {
    try {
      const response = await hubspotService.getContacts(1, null, contactId);
      return response.results && response.results[0] ? response.results[0] : null;
    } catch (error) {
      logger.error(`Error fetching HubSpot contact ${contactId}:`, error);
      return null;
    }
  }

  // Get webhook statistics
  async getWebhookStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalContacts,
        todayUpdates,
        recentErrors
      ] = await Promise.all([
        Contact.countDocuments({ source: 'hubspot' }),
        Contact.countDocuments({
          source: 'hubspot',
          lastSyncedAt: { $gte: today }
        }),
        Contact.countDocuments({
          source: 'hubspot',
          syncErrors: { $ne: [] }
        })
      ]);

      return {
        totalContacts,
        todayUpdates,
        recentErrors,
        webhookUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/webhooks/hubspot`,
        lastUpdate: new Date()
      };
    } catch (error) {
      logger.error('Error getting webhook stats:', error);
      throw error;
    }
  }

  // Real-time contact count for segments
  async getRealtimeSegmentCounts() {
    try {
      const [
        total,
        hubspotContacts,
        googleSheetsContacts,
        csvContacts,
        newLeads,
        prospects,
        customers
      ] = await Promise.all([
        Contact.countDocuments({ status: 'active' }),
        Contact.countDocuments({ source: 'hubspot' }),
        Contact.countDocuments({ source: 'google_sheets' }),
        Contact.countDocuments({ source: { $in: ['csv_upload', 'excel_upload'] } }),
        Contact.countDocuments({ 
          lifecycleStage: 'lead',
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }),
        Contact.countDocuments({ lifecycleStage: 'prospect' }),
        Contact.countDocuments({ lifecycleStage: 'customer' })
      ]);

      return {
        total,
        hubspotContacts,
        googleSheetsContacts,
        csvContacts,
        newLeads,
        prospects,
        customers,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting realtime counts:', error);
      throw error;
    }
  }
}

module.exports = new WebhookService();