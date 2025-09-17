const Contact = require('../models/Contact');
const Segment = require('../models/Segment');
const segmentService = require('../services/segmentService');
const exportService = require('../services/exportService');
const hubspotService = require('../services/hubspotService');
const searchService = require('../services/searchService');
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

      logger.info(`=== SEGMENT EXPORT START ===`);
      logger.info(`Segment ID: ${id}, Format: ${format}, Chunk: ${chunk}`);

      // Get segment info first
      const segment = await segmentService.getSegmentById(id);
      if (!segment) {
        return res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
      }

      logger.info(`Exporting segment: ${segment.name}`);

      // Get total count first
      const totalCount = await segmentService.getSegmentCount(segment.filters);
      logger.info(`Total contacts in segment: ${totalCount}`);

      if (totalCount === 0) {
        return res.status(400).json({
          success: false,
          error: `No contacts found in segment "${segment.name}"`
        });
      }

      // For large segments (>10,000), require chunked download
      if (totalCount > 10000 && !chunk) {
        const chunkSize = 10000;
        const totalChunks = Math.ceil(totalCount / chunkSize);
        
        logger.info(`Large segment: ${totalCount} contacts, creating ${totalChunks} chunks`);
        
        return res.json({
          success: true,
          requiresChunking: true,
          data: {
            segmentName: segment.name,
            totalContacts: totalCount,
            chunkSize: chunkSize,
            totalChunks: totalChunks,
            chunks: Array.from({ length: totalChunks }, (_, i) => ({
              chunkNumber: i + 1,
              startRecord: (i * chunkSize) + 1,
              endRecord: Math.min((i + 1) * chunkSize, totalCount),
              contactCount: Math.min(chunkSize, totalCount - (i * chunkSize)),
              downloadUrl: `/api/segments/${id}/export?format=${format}&chunk=${i + 1}`
            }))
          },
          message: `Segment has ${totalCount} contacts. Download in ${totalChunks} chunks.`
        });
      }

      // Handle chunked download
      if (chunk) {
        const chunkNum = parseInt(chunk);
        if (isNaN(chunkNum) || chunkNum < 1) {
          return res.status(400).json({
            success: false,
            error: 'Invalid chunk number'
          });
        }

        const chunkSize = 10000;
        const skip = (chunkNum - 1) * chunkSize;
        
        logger.info(`Exporting chunk ${chunkNum}: records ${skip + 1} to ${skip + chunkSize}`);
        
        const filename = `${segment.name.replace(/[^a-zA-Z0-9]/g, '_')}_chunk_${chunkNum}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        return await this.exportSegmentChunk(segment, res, skip, chunkSize, chunkNum);
      }

      // For smaller segments, direct download
      logger.info(`Small segment: ${totalCount} contacts, direct download`);
      const filename = `${segment.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return await this.exportSegmentChunk(segment, res, 0, totalCount, 1);
      
    } catch (error) {
      logger.error('Error exporting segment:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to export segment: ' + error.message
        });
      }
    }
  }

  async streamSegmentExport(segment, res, totalCount, exportId) {
    const BATCH_SIZE = 1000; // Process 1000 contacts at a time
    let processedCount = 0;
    let page = 1;

    try {
      logger.info(`Starting stream export for ${totalCount} contacts in batches of ${BATCH_SIZE}`);
      
      // Write CSV headers first
      const headers = [
        'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Job Title',
        'Street Address', 'City', 'State', 'Zip Code', 'Country',
        'Source', 'Lifecycle Stage', 'Status', 'DNC Status', 'DNC Date', 'DNC Reason',
        'Compliance Notes', 'Tags', 'Created Date', 'Last Synced'
      ];
      
      logger.info(`Writing CSV headers...`);
      res.write(headers.map(h => `"${h}"`).join(',') + '\n');

      // Process contacts in batches
      logger.info(`Starting batch processing loop...`);
      while (processedCount < totalCount) {
        logger.info(`Processing batch ${page}: getting contacts ${processedCount + 1} to ${processedCount + BATCH_SIZE}`);
        
        const segmentResult = await segmentService.getSegmentContacts(segment._id, {
          page: page,
          limit: BATCH_SIZE,
          sort: { createdAt: -1 }
        });

        const contacts = segmentResult.contacts || [];
        logger.info(`Retrieved ${contacts.length} contacts for batch ${page}`);
        
        if (contacts.length === 0) {
          logger.info(`No more contacts found, breaking loop at page ${page}`);
          break;
        }

        // Convert batch to CSV and stream
        for (const contact of contacts) {
          // Convert to plain object if it's a Mongoose document
          const contactObj = contact.toObject ? contact.toObject() : contact;
          
          // For CSV contacts, use original email if available
          let displayEmail = contactObj.email || '';
          if (contactObj.source && contactObj.source.startsWith('csv_') && 
              contactObj.customFields && contactObj.customFields.originalEmail) {
            displayEmail = contactObj.customFields.originalEmail;
          }

          const escapeCSV = (value) => {
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          };

          const row = [
            escapeCSV(contactObj.firstName || ''),
            escapeCSV(contactObj.lastName || ''),
            escapeCSV(displayEmail),
            escapeCSV(contactObj.phone || ''),
            escapeCSV(contactObj.company || ''),
            escapeCSV(contactObj.jobTitle || ''),
            escapeCSV(contactObj.address?.street || ''),
            escapeCSV(contactObj.address?.city || ''),
            escapeCSV(contactObj.address?.state || ''),
            escapeCSV(contactObj.address?.zipCode || ''),
            escapeCSV(contactObj.address?.country || ''),
            escapeCSV(contactObj.source || ''),
            escapeCSV(contactObj.lifecycleStage || ''),
            escapeCSV(contactObj.status || ''),
            escapeCSV(contactObj.dncStatus || 'callable'),
            escapeCSV(contactObj.dncDate ? new Date(contactObj.dncDate).toISOString() : ''),
            escapeCSV(contactObj.dncReason || ''),
            escapeCSV(contactObj.complianceNotes || ''),
            escapeCSV(contactObj.tags?.join('; ') || ''),
            escapeCSV(contactObj.createdAt ? new Date(contactObj.createdAt).toISOString() : ''),
            escapeCSV(contactObj.lastSyncedAt ? new Date(contactObj.lastSyncedAt).toISOString() : '')
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

  async exportSegmentChunk(segment, res, skip, limit, chunkNum) {
    try {
      logger.info(`Exporting chunk ${chunkNum}: records ${skip + 1} to ${skip + limit}`);

      // CSV headers
      const headers = [
        'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Job Title',
        'Street Address', 'City', 'State', 'Zip Code', 'Country',
        'Source', 'Lifecycle Stage', 'Status', 'DNC Status', 'DNC Date', 'DNC Reason',
        'Compliance Notes', 'Tags', 'Created Date', 'Last Synced'
      ];
      
      // Write headers
      res.write(headers.map(h => `"${h}"`).join(',') + '\n');

      // Get contacts using proper pagination
      const query = searchService.buildFilterQuery(segment.filters);
      logger.info(`Built query for chunk:`, JSON.stringify(query, null, 2));
      
      const contacts = await Contact.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(); // Use lean for better performance

      logger.info(`Retrieved ${contacts.length} contacts for chunk ${chunkNum}`);

      if (contacts.length === 0) {
        logger.warn(`No contacts found for chunk ${chunkNum}`);
        res.end();
        return;
      }

      // Process and write contacts
      for (const contact of contacts) {
        // For CSV contacts, use original email if available
        let displayEmail = contact.email || '';
        if (contact.source && contact.source.startsWith('csv_') && 
            contact.customFields && contact.customFields.originalEmail) {
          displayEmail = contact.customFields.originalEmail;
        }

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
          escapeCSV(displayEmail),
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
          escapeCSV(contact.dncDate ? new Date(contact.dncDate).toISOString().split('T')[0] : ''),
          escapeCSV(contact.dncReason || ''),
          escapeCSV(contact.complianceNotes || ''),
          escapeCSV(Array.isArray(contact.tags) ? contact.tags.join('; ') : ''),
          escapeCSV(contact.createdAt ? new Date(contact.createdAt).toISOString().split('T')[0] : ''),
          escapeCSV(contact.lastSyncedAt ? new Date(contact.lastSyncedAt).toISOString().split('T')[0] : '')
        ];

        res.write(row.join(',') + '\n');
      }

      res.end();
      logger.info(`Chunk ${chunkNum} export completed: ${contacts.length} contacts`);

    } catch (error) {
      logger.error(`Error exporting chunk ${chunkNum}:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to export chunk: ' + error.message
        });
      } else {
        res.end();
      }
    }
  }
          escapeCSV(contactObj.dncDate ? new Date(contactObj.dncDate).toISOString() : ''),
          escapeCSV(contactObj.dncReason || ''),
          escapeCSV(contactObj.complianceNotes || ''),
          escapeCSV(contactObj.tags?.join('; ') || ''),
          escapeCSV(contactObj.createdAt ? new Date(contactObj.createdAt).toISOString() : ''),
          escapeCSV(contactObj.lastSyncedAt ? new Date(contactObj.lastSyncedAt).toISOString() : '')
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

  async debugSegment(req, res) {
    try {
      const { id } = req.params;
      
      logger.info(`=== SEGMENT DEBUG FOR ID: ${id} ===`);
      
      // Get segment info
      const segment = await segmentService.getSegmentById(id);
      if (!segment) {
        return res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
      }

      // Get total contacts in database
      const totalContacts = await Contact.countDocuments();
      
      // Test the segment filters
      const segmentCount = await segmentService.getSegmentCount(segment.filters);
      
      // Build the query to see what it looks like
      const builtQuery = searchService.buildFilterQuery(segment.filters);
      
      // Get a few sample contacts that match (if any)
      const sampleContacts = await Contact.find(builtQuery).limit(3).lean();
      
      // Test different variations of the query
      const debugInfo = {
        segmentInfo: {
          id: segment._id,
          name: segment.name,
          description: segment.description,
          createdAt: segment.createdAt,
          isSystem: segment.isSystem
        },
        filters: segment.filters,
        builtQuery: builtQuery,
        counts: {
          totalContactsInDB: totalContacts,
          segmentContactCount: segmentCount,
          sampleContactsFound: sampleContacts.length
        },
        sampleContacts: sampleContacts.map(c => ({
          id: c._id,
          source: c.source,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          createdAt: c.createdAt
        }))
      };

      logger.info('Segment debug info:', debugInfo);

      res.json({
        success: true,
        data: debugInfo
      });
    } catch (error) {
      logger.error('Error in debugSegment:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
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