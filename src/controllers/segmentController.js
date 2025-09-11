const segmentService = require('../services/segmentService');
const exportService = require('../services/exportService');
const hubspotService = require('../services/hubspotService');
const logger = require('../utils/logger');

class SegmentController {
  async getAllSegments(req, res) {
    try {
      const segments = await segmentService.getAllSegments();
      
      res.json({
        success: true,
        data: segments
      });
    } catch (error) {
      logger.error('Error in getAllSegments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch segments'
      });
    }
  }

  async createSegment(req, res) {
    try {
      const segmentData = req.body;
      
      if (!segmentData.name || !segmentData.filters) {
        return res.status(400).json({
          success: false,
          error: 'Name and filters are required'
        });
      }

      const segment = await segmentService.createSegment(segmentData);
      
      res.status(201).json({
        success: true,
        data: segment,
        message: 'Segment created successfully'
      });
    } catch (error) {
      logger.error('Error creating segment:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'Segment with this name already exists'
        });
      }
      
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getSegmentById(req, res) {
    try {
      const { id } = req.params;
      const segment = await segmentService.getSegmentById(id);
      
      res.json({
        success: true,
        data: segment
      });
    } catch (error) {
      logger.error('Error in getSegmentById:', error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  async getSegmentContacts(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 100, sort = 'createdAt', order = 'desc' } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sort]: order === 'desc' ? -1 : 1 }
      };

      const result = await segmentService.getSegmentContacts(id, options);
      
      res.json({
        success: true,
        data: result.contacts,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in getSegmentContacts:', error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateSegment(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const segment = await segmentService.updateSegment(id, updateData);
      
      res.json({
        success: true,
        data: segment,
        message: 'Segment updated successfully'
      });
    } catch (error) {
      logger.error('Error updating segment:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteSegment(req, res) {
    try {
      const { id } = req.params;
      const result = await segmentService.deleteSegment(id);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Error deleting segment:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async duplicateSegment(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'New segment name is required'
        });
      }

      const duplicatedSegment = await segmentService.duplicateSegment(id, name);
      
      res.status(201).json({
        success: true,
        data: duplicatedSegment,
        message: 'Segment duplicated successfully'
      });
    } catch (error) {
      logger.error('Error duplicating segment:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async exportSegment(req, res) {
    try {
      const { id } = req.params;
      const { format = 'csv' } = req.query;

      const exportData = await segmentService.getSegmentExportData(id, format);
      
      // Use existing export service
      const result = format.toLowerCase() === 'excel' 
        ? await exportService.exportToExcel({}, { 
            contacts: exportData.contacts,
            filename: `${exportData.segmentName.replace(/\s+/g, '_')}_export_${Date.now()}`
          })
        : await exportService.exportToCSV({}, { 
            contacts: exportData.contacts,
            filename: `${exportData.segmentName.replace(/\s+/g, '_')}_export_${Date.now()}`
          });

      res.json({
        success: true,
        data: {
          filename: result.filename,
          recordCount: result.recordCount,
          format: result.format,
          downloadUrl: `/api/export/download/${result.filename}`
        },
        message: `${exportData.segmentName} exported: ${result.recordCount} contacts`
      });
    } catch (error) {
      logger.error('Error exporting segment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export segment'
      });
    }
  }

  async getFilterTemplates(req, res) {
    try {
      const templates = segmentService.getFilterTemplates();
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Error getting filter templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get filter templates'
      });
    }
  }

  async getHubSpotLists(req, res) {
    try {
      const lists = await hubspotService.getContactLists();
      
      res.json({
        success: true,
        data: lists
      });
    } catch (error) {
      logger.error('Error fetching HubSpot lists:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch HubSpot lists'
      });
    }
  }

  async syncHubSpotList(req, res) {
    try {
      const { listId, listName } = req.body;
      
      if (!listId) {
        return res.status(400).json({
          success: false,
          error: 'HubSpot list ID is required'
        });
      }

      // Get contacts from HubSpot list
      const hubspotContacts = await hubspotService.getAllContactsFromList(listId);
      
      // Create a segment for this HubSpot list
      const segmentData = {
        name: `HubSpot: ${listName || `List ${listId}`}`,
        description: `Contacts from HubSpot list: ${listName || listId}`,
        filters: { 
          source: 'hubspot',
          'customFields.hubspotListId': listId.toString()
        },
        color: '#ff7a59',
        icon: 'fab fa-hubspot'
      };

      // Process contacts and add list ID to custom fields
      let processed = 0;
      let created = 0;
      let updated = 0;

      for (const hubspotContact of hubspotContacts) {
        try {
          const contactData = hubspotService.transformContactData(hubspotContact);
          
          // Add list ID to custom fields
          contactData.customFields.hubspotListId = listId.toString();
          contactData.customFields.hubspotListName = listName || `List ${listId}`;
          
          const existingContact = await Contact.findOne({
            source: 'hubspot',
            sourceId: contactData.sourceId
          });
          
          if (existingContact) {
            Object.assign(existingContact, contactData);
            existingContact.lastSyncedAt = new Date();
            await existingContact.save();
            updated++;
          } else {
            const contact = new Contact(contactData);
            await contact.save();
            created++;
          }
          
          processed++;
        } catch (error) {
          logger.error('Error processing HubSpot list contact:', error);
        }
      }

      // Create the segment
      let segment;
      try {
        segment = await segmentService.createSegment(segmentData);
      } catch (error) {
        if (error.code === 11000) {
          // Segment already exists, update it
          segment = await Segment.findOne({ name: segmentData.name });
        } else {
          throw error;
        }
      }

      res.json({
        success: true,
        data: {
          segment,
          syncResults: {
            processed,
            created,
            updated,
            totalContacts: hubspotContacts.length
          }
        },
        message: `HubSpot list synced: ${processed} contacts processed`
      });
      
    } catch (error) {
      logger.error('Error syncing HubSpot list:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new SegmentController();