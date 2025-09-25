const Contact = require('../models/Contact');
const SyncJob = require('../models/SyncJob');
const hubspotService = require('./hubspotService');
const googleSheetsService = require('./googleSheetsService');
const logger = require('../utils/logger');

class SyncService {
  constructor() {
    this.activeSyncJobs = new Map();
  }

  async startHubSpotSync(type = 'full_sync') {
    try {
      // Check if there's already an active HubSpot sync
      const activeSync = await SyncJob.findOne({
        source: 'hubspot',
        status: { $in: ['pending', 'running'] }
      });

      if (activeSync) {
        throw new Error('HubSpot sync already in progress');
      }

      // Create sync job
      const syncJob = new SyncJob({
        source: 'hubspot',
        type,
        status: 'pending'
      });
      await syncJob.save();

      // Start sync in background
      this.performHubSpotSync(syncJob._id).catch(error => {
        logger.error('HubSpot sync failed:', error);
      });

      return {
        jobId: syncJob._id,
        message: 'HubSpot sync started'
      };
    } catch (error) {
      logger.error('Error starting HubSpot sync:', error);
      throw error;
    }
  }

  async performHubSpotSync(jobId) {
    const syncJob = await SyncJob.findById(jobId);
    if (!syncJob) return;

    try {
      // Update job status
      syncJob.status = 'running';
      syncJob.startedAt = new Date();
      await syncJob.save();

      logger.info(`Starting HubSpot sync job ${jobId}`);

      let contacts;
      if (syncJob.type === 'incremental_sync') {
        // Get contacts modified since last sync
        const lastSync = await SyncJob.findOne({
          source: 'hubspot',
          status: 'completed'
        }).sort({ completedAt: -1 });

        const since = lastSync ? lastSync.completedAt : new Date(Date.now() - 24 * 60 * 60 * 1000);
        contacts = await hubspotService.getContactsSince(since.getTime());
      } else {
        // Full sync
        contacts = await hubspotService.getAllContacts();
      }

      syncJob.totalRecords = contacts.length;
      await syncJob.save();

      // Process contacts in batches
      const batchSize = 100;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        await this.processBatch(batch, syncJob, 'hubspot');
      }

      // Complete sync job
      syncJob.status = 'completed';
      syncJob.completedAt = new Date();
      await syncJob.save();

      logger.info(`Completed HubSpot sync job ${jobId}: ${syncJob.summary.created} created, ${syncJob.summary.updated} updated`);

    } catch (error) {
      logger.error(`HubSpot sync job ${jobId} failed:`, error);
      syncJob.status = 'failed';
      syncJob.syncErrors.push({
        error: error.message,
        timestamp: new Date()
      });
      await syncJob.save();
    }
  }

  async startGoogleSheetsSync(spreadsheetId, sheetName = null, type = 'full_sync') {
    try {
      const activeSync = await SyncJob.findOne({
        source: 'google_sheets',
        status: { $in: ['pending', 'running'] }
      });

      if (activeSync) {
        throw new Error('Google Sheets sync already in progress');
      }

      const syncJob = new SyncJob({
        source: 'google_sheets',
        type,
        status: 'pending',
        config: {
          spreadsheetId,
          sheetName
        }
      });
      await syncJob.save();

      // Start sync in background
      this.performGoogleSheetsSync(syncJob._id).catch(error => {
        logger.error('Google Sheets sync failed:', error);
      });

      return {
        jobId: syncJob._id,
        message: 'Google Sheets sync started'
      };
    } catch (error) {
      logger.error('Error starting Google Sheets sync:', error);
      throw error;
    }
  }

  async performGoogleSheetsSync(jobId) {
    const syncJob = await SyncJob.findById(jobId);
    if (!syncJob) return;

    try {
      syncJob.status = 'running';
      syncJob.startedAt = new Date();
      await syncJob.save();

      logger.info('syncJob.config:', syncJob.config);
      const spreadsheetId = syncJob.config.get('spreadsheetId') || syncJob.config.spreadsheetId;
      const sheetName = syncJob.config.get('sheetName') || syncJob.config.sheetName;
      logger.info(`Starting Google Sheets sync job ${jobId} for sheet ${spreadsheetId} (sheetName: ${sheetName})`);

      const sheetsData = await googleSheetsService.getAllSheetData(spreadsheetId, sheetName);
      let allContacts = [];

      for (const sheetData of sheetsData) {
        const contacts = googleSheetsService.transformSheetData(sheetData.data);
        allContacts = allContacts.concat(contacts);
      }

      syncJob.totalRecords = allContacts.length;
      await syncJob.save();

      // Process contacts in batches
      const batchSize = 100;
      for (let i = 0; i < allContacts.length; i += batchSize) {
        const batch = allContacts.slice(i, i + batchSize);
        await this.processBatch(batch, syncJob, 'google_sheets');
      }

      syncJob.status = 'completed';
      syncJob.completedAt = new Date();
      await syncJob.save();

      logger.info(`Completed Google Sheets sync job ${jobId}: ${syncJob.summary.created} created, ${syncJob.summary.updated} updated`);

    } catch (error) {
      logger.error(`Google Sheets sync job ${jobId} failed:`, error);
      syncJob.status = 'failed';
      syncJob.syncErrors.push({
        error: error.message,
        timestamp: new Date()
      });
      await syncJob.save();
    }
  }

  async processBatch(contacts, syncJob, source) {
    const promises = contacts.map(async (contactData) => {
      try {
        let transformedData;
        
        if (source === 'hubspot') {
          transformedData = hubspotService.transformContactData(contactData);
        } else {
          transformedData = contactData; // Already transformed for Google Sheets
        }

        // Check if contact exists
        const existingContact = await Contact.findOne({
          $or: [
            { email: transformedData.email },
            { source: transformedData.source, sourceId: transformedData.sourceId }
          ]
        });

        if (existingContact) {
          // Update existing contact
          Object.assign(existingContact, transformedData);
          existingContact.lastSyncedAt = new Date();
          await existingContact.save();
          
          syncJob.summary.updated++;
          syncJob.successCount++;
        } else {
          // Create new contact
          const newContact = new Contact(transformedData);
          await newContact.save();
          
          syncJob.summary.created++;
          syncJob.successCount++;
        }

        syncJob.processedRecords++;
        
      } catch (error) {
        logger.error('Error processing contact:', error);
        syncJob.errorCount++;
        syncJob.syncErrors.push({
          record: contactData,
          error: error.message,
          timestamp: new Date()
        });
      }
    });

    await Promise.all(promises);
    await syncJob.save();
  }

  async getSyncJobStatus(jobId) {
    try {
      const syncJob = await SyncJob.findById(jobId);
      if (!syncJob) {
        throw new Error('Sync job not found');
      }

      return {
        id: syncJob._id,
        source: syncJob.source,
        type: syncJob.type,
        status: syncJob.status,
        progress: syncJob.totalRecords > 0 ? 
          (syncJob.processedRecords / syncJob.totalRecords * 100).toFixed(1) : 0,
        totalRecords: syncJob.totalRecords,
        processedRecords: syncJob.processedRecords,
        successCount: syncJob.successCount,
        errorCount: syncJob.errorCount,
        summary: syncJob.summary,
        startedAt: syncJob.startedAt,
        completedAt: syncJob.completedAt,
        errors: syncJob.syncErrors.slice(-5) // Last 5 errors
      };
    } catch (error) {
      logger.error('Error getting sync job status:', error);
      throw error;
    }
  }

  async getAllSyncJobs(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [jobs, total] = await Promise.all([
        SyncJob.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select('-errors -config'),
        SyncJob.countDocuments()
      ]);

      return {
        jobs,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error getting sync jobs:', error);
      throw error;
    }
  }

  async cancelSyncJob(jobId) {
    try {
      const syncJob = await SyncJob.findById(jobId);
      if (!syncJob) {
        throw new Error('Sync job not found');
      }

      if (syncJob.status === 'completed') {
        throw new Error('Cannot cancel completed sync job');
      }

      syncJob.status = 'failed';
      syncJob.syncErrors.push({
        error: 'Job cancelled by user',
        timestamp: new Date()
      });
      await syncJob.save();

      return { message: 'Sync job cancelled' };
    } catch (error) {
      logger.error('Error cancelling sync job:', error);
      throw error;
    }
  }

  async getLastSyncInfo(source) {
    try {
      const lastSync = await SyncJob.findOne({
        source,
        status: 'completed'
      }).sort({ completedAt: -1 });

      return lastSync ? {
        lastSyncAt: lastSync.completedAt,
        recordsProcessed: lastSync.processedRecords,
        summary: lastSync.summary
      } : null;
    } catch (error) {
      logger.error('Error getting last sync info:', error);
      throw error;
    }
  }
}

module.exports = new SyncService();