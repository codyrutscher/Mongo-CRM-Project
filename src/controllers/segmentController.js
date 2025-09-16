const segmentService = require('../services/segmentService');
const exportService = require('../services/exportService');
const hubspotService = require('../services/hubspotService');
const logger = require('../utils/logger');

class SegmentController {
  constructor() {
    this.exportProgress = new Map(); // Track export progress
  }

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
      const { name, description, contactIds, color, icon } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Segment name is required'
        });
      }

      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Contact IDs are required to create a segment'
        });
      }

      // Create segment with contact IDs filter
      const segmentData = {
        name,
        description: description || `Custom segment with ${contactIds.length} selected contacts`,
        filters: {
          '_id': { '$in': contactIds }
        },
        color: color || '#6c757d',
        icon: icon || 'fas fa-users',
        createdBy: 'user'
      };

      const segment = await segmentService.createSegment(segmentData);
      
      res.status(201).json({
        success: true,
        data: segment,
        message: `Segment created with ${contactIds.length} contacts`
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
      const { format = 'csv', chunk } = req.query;

      // Get segment info first
      logger.info(`Getting segment ${id} for export`);
      const segment = await segmentService.getSegmentById(id);
      if (!segment) {
        logger.error(`Segment ${id} not found`);
        return res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
      }

      logger.info(`Segment found: ${segment.name}, filters:`, segment.filters);

      // Get total count first
      const totalCount = await segmentService.getSegmentCount(segment.filters);
      logger.info(`Starting export for segment ${id}: ${totalCount} total contacts`);

      if (totalCount === 0) {
        return res.status(400).json({
          success: false,
          error: 'No contacts found in this segment'
        });
      }

      // For large segments, offer chunked download
      if (totalCount > 10000 && !chunk) {
        const chunkSize = 10000;
        const totalChunks = Math.ceil(totalCount / chunkSize);
        
        return res.json({
          success: true,
          requiresChunking: true,
          data: {
            totalContacts: totalCount,
            chunkSize: chunkSize,
            totalChunks: totalChunks,
            downloadUrls: Array.from({ length: totalChunks }, (_, i) => ({
              chunk: i + 1,
              url: `/api/segments/${id}/export?format=${format}&chunk=${i + 1}`,
              contacts: Math.min(chunkSize, totalCount - (i * chunkSize))
            }))
          },
          message: `Segment has ${totalCount} contacts. Download in ${totalChunks} chunks of ${chunkSize} contacts each.`
        });
      }

      // Handle chunked download
      if (chunk) {
        const chunkNum = parseInt(chunk);
        const chunkSize = 10000;
        const skip = (chunkNum - 1) * chunkSize;
        
        const filename = `segment_${segment.name.replace(/[^a-zA-Z0-9]/g, '_')}_chunk_${chunkNum}_export_${Date.now()}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        return await this.streamSegmentChunk(segment, res, skip, chunkSize, chunkNum);
      }

      // Initialize progress tracking for regular export
      const exportId = `export_${id}_${Date.now()}`;
      this.exportProgress.set(exportId, {
        total: totalCount,
        processed: 0,
        status: 'starting',
        startTime: Date.now()
      });

      // Set response headers for streaming download
      const filename = `segment_${segment.name.replace(/[^a-zA-Z0-9]/g, '_')}_export_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('X-Export-ID', exportId);

      // Stream the export for regular datasets
      await this.streamSegmentExport(segment, res, totalCount, exportId);
      
    } catch (error) {
      logger.error('Error exporting segment:', error);
      logger.error('Error stack:', error.stack);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to export segment: ' + error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    }
  }

  async streamSegmentExport(segment, res, totalCount, exportId) {
    const BATCH_SIZE = 1000; // Process 1000 contacts at a time
    let processedCount = 0;
    let page = 1;

    try {
      // Write CSV headers first
      const headers = [
        'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Job Title',
        'Street Address', 'City', 'State', 'Zip Code', 'Country',
        'Source', 'Lifecycle Stage', 'Status', 'DNC Status', 'DNC Date', 'DNC Reason',
        'Compliance Notes', 'Tags', 'Created Date', 'Last Synced'
      ];
      
      res.write(headers.map(h => `"${h}"`).join(',') + '\n');

      // Process contacts in batches
      while (processedCount < totalCount) {
        const segmentResult = await segmentService.getSegmentContacts(segment._id, {
          page: page,
          limit: BATCH_SIZE,
          sort: { createdAt: -1 }
        });

        const contacts = segmentResult.contacts || [];
        
        if (contacts.length === 0) {
          break;
        }

        // Convert batch to CSV and stream
        for (const contact of contacts) {
          const escapeCSV = (value) => {
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          };

          const row = [
            escapeCSV(contact.firstName || ''),
            escapeCSV(contact.lastName || ''),
            escapeCSV(contact.email || ''),
            escapeCSV(contact.phone || ''),
            escapeCSV(contact.company || ''),
            escapeCSV(contact.jobTitle || ''),
            escapeCSV(contact.address?.street || ''),
            escapeCSV(contact.address?.city || ''),
            escapeCSV(contact.address?.state || ''),
            escapeCSV(contact.address?.zipCode || ''),
            escapeCSV(contact.address?.country || ''),
            escapeCSV(contact.source || ''),
            escapeCSV(contact.lifecycleStage || ''),
            escapeCSV(contact.status || ''),
            escapeCSV(contact.dncStatus || 'callable'),
            escapeCSV(contact.dncDate ? new Date(contact.dncDate).toISOString() : ''),
            escapeCSV(contact.dncReason || ''),
            escapeCSV(contact.complianceNotes || ''),
            escapeCSV(contact.tags?.join('; ') || ''),
            escapeCSV(contact.createdAt ? new Date(contact.createdAt).toISOString() : ''),
            escapeCSV(contact.lastSyncedAt ? new Date(contact.lastSyncedAt).toISOString() : '')
          ];

          res.write(row.join(',') + '\n');
        }

        processedCount += contacts.length;
        page++;

        // Update progress tracking
        if (this.exportProgress.has(exportId)) {
          this.exportProgress.set(exportId, {
            ...this.exportProgress.get(exportId),
            processed: processedCount,
            status: 'processing'
          });
        }

        // Log progress for large exports
        if (totalCount > 10000) {
          const progress = Math.round((processedCount / totalCount) * 100);
          logger.info(`Export progress: ${processedCount}/${totalCount} (${progress}%)`);
        }

        // Small delay to prevent overwhelming the database
        if (totalCount > 50000) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      res.end();
      
      // Mark export as completed
      if (this.exportProgress.has(exportId)) {
        this.exportProgress.set(exportId, {
          ...this.exportProgress.get(exportId),
          processed: processedCount,
          status: 'completed',
          endTime: Date.now()
        });
        
        // Clean up progress after 5 minutes
        setTimeout(() => {
          this.exportProgress.delete(exportId);
        }, 5 * 60 * 1000);
      }
      
      logger.info(`Export completed: ${processedCount} contacts exported`);

    } catch (error) {
      logger.error('Error in streaming export:', error);
      
      // Mark export as failed
      if (exportId && this.exportProgress.has(exportId)) {
        this.exportProgress.set(exportId, {
          ...this.exportProgress.get(exportId),
          status: 'failed',
          error: error.message,
          endTime: Date.now()
        });
      }
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Export failed: ' + error.message
        });
      } else {
        res.end();
      }
    }
  }

  async streamSegmentChunk(segment, res, skip, limit, chunkNum) {
    try {
      logger.info(`Exporting chunk ${chunkNum}: ${skip} to ${skip + limit}`);

      // Write CSV headers
      const headers = [
        'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Job Title',
        'Street Address', 'City', 'State', 'Zip Code', 'Country',
        'Source', 'Lifecycle Stage', 'Status', 'DNC Status', 'DNC Date', 'DNC Reason',
        'Compliance Notes', 'Tags', 'Created Date', 'Last Synced'
      ];
      
      res.write(headers.map(h => `"${h}"`).join(',') + '\n');

      // Get contacts for this chunk
      const segmentResult = await segmentService.getSegmentContacts(segment._id, {
        page: Math.floor(skip / limit) + 1,
        limit: limit,
        sort: { createdAt: -1 }
      });

      const contacts = segmentResult.contacts || [];
      
      // Stream contacts
      for (const contact of contacts) {
        const escapeCSV = (value) => {
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        };

        const row = [
          escapeCSV(contact.firstName || ''),
          escapeCSV(contact.lastName || ''),
          escapeCSV(contact.email || ''),
          escapeCSV(contact.phone || ''),
          escapeCSV(contact.company || ''),
          escapeCSV(contact.jobTitle || ''),
          escapeCSV(contact.address?.street || ''),
          escapeCSV(contact.address?.city || ''),
          escapeCSV(contact.address?.state || ''),
          escapeCSV(contact.address?.zipCode || ''),
          escapeCSV(contact.address?.country || ''),
          escapeCSV(contact.source || ''),
          escapeCSV(contact.lifecycleStage || ''),
          escapeCSV(contact.status || ''),
          escapeCSV(contact.dncStatus || 'callable'),
          escapeCSV(contact.dncDate ? new Date(contact.dncDate).toISOString() : ''),
          escapeCSV(contact.dncReason || ''),
          escapeCSV(contact.complianceNotes || ''),
          escapeCSV(contact.tags?.join('; ') || ''),
          escapeCSV(contact.createdAt ? new Date(contact.createdAt).toISOString() : ''),
          escapeCSV(contact.lastSyncedAt ? new Date(contact.lastSyncedAt).toISOString() : '')
        ];

        res.write(row.join(',') + '\n');
      }

      res.end();
      logger.info(`Chunk ${chunkNum} export completed: ${contacts.length} contacts`);

    } catch (error) {
      logger.error('Error in chunk export:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Chunk export failed: ' + error.message
        });
      } else {
        res.end();
      }
    }
  }

  async getExportProgress(req, res) {
    try {
      const { exportId } = req.params;
      
      if (!this.exportProgress.has(exportId)) {
        return res.status(404).json({
          success: false,
          error: 'Export not found or expired'
        });
      }

      const progress = this.exportProgress.get(exportId);
      const percentage = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

      res.json({
        success: true,
        data: {
          ...progress,
          percentage,
          duration: progress.endTime ? 
            progress.endTime - progress.startTime : 
            Date.now() - progress.startTime
        }
      });
    } catch (error) {
      logger.error('Error getting export progress:', error);
      res.status(500).json({
        success: false,
        error: error.message
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