const syncService = require('../services/syncService');
const hubspotService = require('../services/hubspotService');
const googleSheetsService = require('../services/googleSheetsService');
const logger = require('../utils/logger');

class SyncController {
  async startHubSpotSync(req, res) {
    try {
      const { type = 'full_sync' } = req.body;
      
      // Test HubSpot connection first
      const connectionTest = await hubspotService.testConnection();
      if (!connectionTest) {
        return res.status(400).json({
          success: false,
          error: 'HubSpot connection failed. Please check your access token.'
        });
      }

      const result = await syncService.startHubSpotSync(type);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error starting HubSpot sync:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async startGoogleSheetsSync(req, res) {
    try {
      console.log('Google Sheets sync request body:', req.body);
      const { spreadsheetId, sheetName, type = 'full_sync' } = req.body;
      console.log('Extracted values - spreadsheetId:', spreadsheetId, 'sheetName:', sheetName);

      if (!spreadsheetId) {
        console.log('spreadsheetId is missing or empty');
        return res.status(400).json({
          success: false,
          error: 'Spreadsheet ID is required'
        });
      }

      // Extract spreadsheet ID from URL if needed
      const actualSpreadsheetId = googleSheetsService.extractSpreadsheetId(spreadsheetId);

      // Test Google Sheets connection
      const connectionTest = await googleSheetsService.testConnection(actualSpreadsheetId);
      if (!connectionTest) {
        return res.status(400).json({
          success: false,
          error: 'Google Sheets connection failed. Please check your credentials and spreadsheet permissions.'
        });
      }

      const result = await syncService.startGoogleSheetsSync(actualSpreadsheetId, sheetName, type);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error starting Google Sheets sync:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getSyncJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      const status = await syncService.getSyncJobStatus(jobId);
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Error getting sync job status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getAllSyncJobs(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await syncService.getAllSyncJobs(
        parseInt(page),
        parseInt(limit)
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting sync jobs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sync jobs'
      });
    }
  }

  async cancelSyncJob(req, res) {
    try {
      const { jobId } = req.params;
      const result = await syncService.cancelSyncJob(jobId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error cancelling sync job:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getLastSyncInfo(req, res) {
    try {
      const { source } = req.params;
      
      if (!['hubspot', 'google_sheets'].includes(source)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid source. Must be "hubspot" or "google_sheets"'
        });
      }

      const lastSync = await syncService.getLastSyncInfo(source);
      
      res.json({
        success: true,
        data: lastSync
      });
    } catch (error) {
      logger.error('Error getting last sync info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sync information'
      });
    }
  }

  async testHubSpotConnection(req, res) {
    try {
      const result = await hubspotService.testConnection();
      
      res.json({
        success: true,
        data: {
          connected: result,
          message: result ? 'HubSpot connection successful' : 'HubSpot connection failed'
        }
      });
    } catch (error) {
      logger.error('Error testing HubSpot connection:', error);
      res.status(500).json({
        success: false,
        error: 'Connection test failed'
      });
    }
  }

  async testGoogleSheetsConnection(req, res) {
    try {
      const { spreadsheetId } = req.body;

      if (!spreadsheetId) {
        return res.status(400).json({
          success: false,
          error: 'Spreadsheet ID is required'
        });
      }

      const actualSpreadsheetId = googleSheetsService.extractSpreadsheetId(spreadsheetId);
      const result = await googleSheetsService.testConnection(actualSpreadsheetId);
      
      res.json({
        success: true,
        data: {
          connected: result,
          message: result ? 'Google Sheets connection successful' : 'Google Sheets connection failed'
        }
      });
    } catch (error) {
      logger.error('Error testing Google Sheets connection:', error);
      res.status(500).json({
        success: false,
        error: 'Connection test failed'
      });
    }
  }

  async getGoogleSheetInfo(req, res) {
    try {
      const { spreadsheetId } = req.params;
      const actualSpreadsheetId = googleSheetsService.extractSpreadsheetId(spreadsheetId);
      
      const metadata = await googleSheetsService.getSheetMetadata(actualSpreadsheetId);
      
      res.json({
        success: true,
        data: metadata
      });
    } catch (error) {
      logger.error('Error getting Google Sheet info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sheet information'
      });
    }
  }

  async previewGoogleSheetData(req, res) {
    try {
      const { spreadsheetId, sheetName, rows = 5 } = req.body;
      
      if (!spreadsheetId) {
        return res.status(400).json({
          success: false,
          error: 'Spreadsheet ID is required'
        });
      }

      const actualSpreadsheetId = googleSheetsService.extractSpreadsheetId(spreadsheetId);
      const range = sheetName ? `${sheetName}!A1:Z${rows}` : `A1:Z${rows}`;
      
      const data = await googleSheetsService.getSheetData(actualSpreadsheetId, range);
      
      res.json({
        success: true,
        data: {
          preview: data,
          rowCount: data.length
        }
      });
    } catch (error) {
      logger.error('Error getting Google Sheet preview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sheet preview'
      });
    }
  }

  async syncColdLeads(req, res) {
    try {
      logger.info('Starting Railway Cold Lead sync from HubSpot...');
      
      // Import the Railway Cold Lead sync functionality
      const { exec } = require('child_process');
      const path = require('path');
      
      // Execute the Railway Cold Lead sync script
      const scriptPath = path.join(__dirname, '../../scripts/railway-cold-lead-sync.js');
      
      exec(`node ${scriptPath}`, { timeout: 30 * 60 * 1000 }, (error, stdout, stderr) => {
        if (error) {
          logger.error('Railway Cold Lead sync error:', error);
          return;
        }
        
        if (stderr) {
          logger.warn('Railway Cold Lead sync stderr:', stderr);
        }
        
        logger.info('Railway Cold Lead sync completed:', stdout);
      });
      
      res.json({
        success: true,
        message: 'Railway Cold Lead sync started',
        details: 'Syncing all HubSpot contacts and labeling Cold Leads',
        note: 'This process may take 10-15 minutes to complete all contacts',
        endpoint: 'Check /api/contacts/stats for progress'
      });
      
    } catch (error) {
      logger.error('Error starting Railway Cold Lead sync:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getColdLeadStatus(req, res) {
    try {
      const Contact = require('../models/Contact');
      
      // Get Cold Lead statistics
      const totalContacts = await Contact.countDocuments();
      const coldLeads = await Contact.countDocuments({ 'customFields.coldLead': true });
      
      const sellerColdLeads = await Contact.countDocuments({ 'customFields.sellerColdLead': true });
      const buyerColdLeads = await Contact.countDocuments({ 'customFields.buyerColdLead': true });
      const creColdLeads = await Contact.countDocuments({ 'customFields.creColdLead': true });
      const exfColdLeads = await Contact.countDocuments({ 'customFields.exfColdLead': true });
      
      // Check if Doug Broomes exists
      const dougBroomes = await Contact.findOne({ email: 'doug@ironwood-works.com' });
      
      res.json({
        success: true,
        data: {
          totalContacts,
          coldLeads: {
            total: coldLeads,
            seller: sellerColdLeads,
            buyer: buyerColdLeads,
            cre: creColdLeads,
            exf: exfColdLeads
          },
          testContact: {
            dougBroomes: dougBroomes ? {
              name: `${dougBroomes.firstName} ${dougBroomes.lastName}`,
              email: dougBroomes.email,
              company: dougBroomes.company,
              hubspotId: dougBroomes.sourceId,
              isColdLead: dougBroomes.customFields?.coldLead || false,
              coldLeadTypes: dougBroomes.customFields?.coldLeadTypes || [],
              tags: dougBroomes.tags || []
            } : null
          },
          lastUpdated: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Error getting Cold Lead status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new SyncController();