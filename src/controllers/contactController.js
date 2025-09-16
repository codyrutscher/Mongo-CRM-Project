const Contact = require('../models/Contact');
const searchService = require('../services/searchService');
const fileUploadService = require('../services/fileUploadService');
const segmentService = require('../services/segmentService');
const logger = require('../utils/logger');

class ContactController {
  async getContacts(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        sort = 'createdAt', 
        order = 'desc',
        search = '',
        dncStatus = '',
        contactType = '',
        location = '',
        source = '',
        industry = '',
        sicCode = '',
        naicsCode = '',
        dateFilter = ''
      } = req.query;

      // Build filters object from query parameters
      const filters = {};
      
      if (dncStatus) filters.dncStatus = dncStatus;
      if (contactType) filters['customFields.contactType'] = contactType;
      if (location) filters['address.state'] = location;
      if (source) filters.source = source;
      if (industry) {
        filters['customFields.businessCategory'] = new RegExp(industry, 'i');
      }
      if (sicCode) {
        filters['customFields.sicCode'] = sicCode;
      }
      
      if (dateFilter) {
        const now = new Date();
        let startDate;
        
        switch(dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'quarter':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        }
        
        if (startDate) {
          filters.createdAt = { $gte: startDate };
        }
      }

      const sortObject = { [sort]: order === 'desc' ? -1 : 1 };
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: sortObject
      };

      let result;
      
      console.log('Controller filters built:', filters);
      console.log('Filter count:', Object.keys(filters).length);
      
      if (search) {
        result = await searchService.textSearch(search, options);
      } else if (Object.keys(filters).length > 0) {
        console.log('Using advanced search with filters');
        result = await searchService.advancedSearch(filters, options);
      } else {
        console.log('Using search with no filters');
        result = await searchService.searchContacts({}, options);
      }

      res.json({
        success: true,
        data: result.contacts,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in getContacts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contacts'
      });
    }
  }

  async getContactById(req, res) {
    try {
      const contact = await Contact.findById(req.params.id);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
      }

      res.json({
        success: true,
        data: contact
      });
    } catch (error) {
      logger.error('Error in getContactById:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contact'
      });
    }
  }

  async createContact(req, res) {
    try {
      const contactData = {
        ...req.body,
        source: 'manual',
        sourceId: `manual_${Date.now()}`,
        lastSyncedAt: new Date()
      };

      const contact = new Contact(contactData);
      await contact.save();

      res.status(201).json({
        success: true,
        data: contact,
        message: 'Contact created successfully'
      });
    } catch (error) {
      logger.error('Error in createContact:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'Contact with this email already exists'
        });
      }

      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateContact(req, res) {
    try {
      const contact = await Contact.findByIdAndUpdate(
        req.params.id,
        { ...req.body, lastSyncedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
      }

      res.json({
        success: true,
        data: contact,
        message: 'Contact updated successfully'
      });
    } catch (error) {
      logger.error('Error in updateContact:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteContact(req, res) {
    try {
      const contact = await Contact.findByIdAndUpdate(
        req.params.id,
        { status: 'deleted' },
        { new: true }
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
      }

      res.json({
        success: true,
        message: 'Contact marked as deleted'
      });
    } catch (error) {
      logger.error('Error in deleteContact:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete contact'
      });
    }
  }

  async uploadContacts(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const validationErrors = fileUploadService.validateFile(req.file);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: validationErrors.join(', ')
        });
      }

      // Get source name from request body or use filename
      const sourceName = req.body.sourceName || req.file.originalname.replace(/\.[^/.]+$/, "");
      const cleanSourceName = sourceName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const source = `csv_${cleanSourceName}`;

      const result = await fileUploadService.processUploadedFile(req.file, source);
      
      // Save contacts to database (NO deduplication - separate lists)
      const savedContacts = [];
      const errors = [];
      const uploadBatch = `csv_batch_${Date.now()}`;

      for (const contactData of result.data) {
        try {
          // Always create new contact (no deduplication between sources)
          contactData.customFields = contactData.customFields || {};
          contactData.customFields.uploadBatch = uploadBatch;
          contactData.customFields.uploadTimestamp = new Date().toISOString();
          contactData.customFields.csvUploadSource = 'true';
          
          // Set source metadata
          contactData.sourceMetadata = {
            uploadName: sourceName,
            fileName: req.file.originalname,
            uploadDate: new Date()
          };
          
          // Use unique email to avoid conflicts with other sources
          if (contactData.email && !contactData.email.includes('_csv_')) {
            contactData.customFields.originalEmail = contactData.email;
            contactData.email = `${contactData.email.split('@')[0]}_csv_${Date.now()}@${contactData.email.split('@')[1]}`;
          }
          
          const contact = new Contact(contactData);
          await contact.save();
          savedContacts.push(contact);
        } catch (error) {
          errors.push({
            contact: contactData,
            error: error.message
          });
        }
      }

      // Create automatic segment for this upload
      if (savedContacts.length > 0) {
        try {
          const segmentName = `${sourceName} - ${new Date().toLocaleDateString()} (${savedContacts.length} contacts)`;
          const segmentData = {
            name: segmentName,
            description: `Contacts uploaded from ${sourceName} on ${new Date().toLocaleString()}`,
            filters: {
              'customFields.uploadBatch': uploadBatch
            },
            color: '#6f42c1',
            icon: 'fas fa-file-csv',
            createdBy: source
          };
          
          const segment = await segmentService.createSegment(segmentData);
          logger.info(`Created automatic segment: ${segmentName}`);
        } catch (segmentError) {
          logger.error('Error creating automatic segment:', segmentError);
        }
      }

      const stats = {
        totalProcessed: result.data.length,
        successful: savedContacts.length,
        errors: errors.length,
        parseErrors: result.errors.length
      };

      res.json({
        success: true,
        data: {
          contacts: savedContacts,
          stats,
          parseErrors: result.errors,
          saveErrors: errors
        },
        message: `Upload completed: ${stats.successful} contacts processed`
      });
    } catch (error) {
      logger.error('Error in uploadContacts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process file upload'
      });
    }
  }

  async searchContacts(req, res) {
    try {
      const { query, filters = {}, ...options } = req.body;

      console.log('=== SEARCH CONTACTS DEBUG ===');
      console.log('Query:', query);
      console.log('Filters:', JSON.stringify(filters, null, 2));
      console.log('Options:', JSON.stringify(options, null, 2));

      let result;
      if (query) {
        console.log('Using text search');
        result = await searchService.textSearch(query, options);
      } else {
        console.log('Using advanced search with filters');
        result = await searchService.advancedSearch(filters, options);
      }

      console.log('Search result:', {
        contactCount: result.contacts.length,
        totalRecords: result.pagination.totalRecords,
        currentPage: result.pagination.current
      });

      res.json({
        success: true,
        data: result.contacts,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in searchContacts:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }
  }

  async getContactsBySegment(req, res) {
    try {
      const { segment } = req.params;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const result = await searchService.getContactsBySegment(segment, options);

      res.json({
        success: true,
        data: result.contacts,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in getContactsBySegment:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getSegments(req, res) {
    try {
      const segments = await searchService.getAvailableSegments();
      
      res.json({
        success: true,
        data: segments
      });
    } catch (error) {
      logger.error('Error in getSegments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch segments'
      });
    }
  }

  async getContactStats(req, res) {
    try {
      const stats = await searchService.getContactStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in getContactStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  }

  async debugContactStats(req, res) {
    try {
      logger.info('Starting contact stats debug...');
      
      // Test individual queries to see what's happening
      const totalContacts = await Contact.countDocuments();
      logger.info(`Total contacts: ${totalContacts}`);

      // Test source breakdown
      const hubspotCount = await Contact.countDocuments({ source: 'hubspot' });
      const sheetsCount = await Contact.countDocuments({ source: 'google_sheets' });
      const csvCount = await Contact.countDocuments({ source: { $regex: '^csv_' } });
      
      logger.info(`Source breakdown: HubSpot=${hubspotCount}, Sheets=${sheetsCount}, CSV=${csvCount}`);

      // Test field existence
      const hasFirstName = await Contact.countDocuments({ firstName: { $exists: true, $ne: '', $ne: null } });
      const hasLastName = await Contact.countDocuments({ lastName: { $exists: true, $ne: '', $ne: null } });
      const hasEmail = await Contact.countDocuments({ email: { $exists: true, $ne: '', $ne: null } });
      const hasPhone = await Contact.countDocuments({ phone: { $exists: true, $ne: '', $ne: null } });
      const hasCompany = await Contact.countDocuments({ company: { $exists: true, $ne: '', $ne: null } });

      logger.info(`Field existence: firstName=${hasFirstName}, lastName=${hasLastName}, email=${hasEmail}, phone=${hasPhone}, company=${hasCompany}`);

      // Test clean contacts query
      const cleanTotal = await Contact.countDocuments({
        firstName: { $exists: true, $ne: '', $ne: null },
        lastName: { $exists: true, $ne: '', $ne: null },
        email: { $exists: true, $ne: '', $ne: null },
        phone: { $exists: true, $ne: '', $ne: null },
        company: { $exists: true, $ne: '', $ne: null }
      });
      logger.info(`Clean contacts (all fields): ${cleanTotal}`);

      // Test email only query
      const emailOnlyTotal = await Contact.countDocuments({
        email: { $exists: true, $ne: '', $ne: null },
        $or: [
          { phone: { $exists: false } },
          { phone: '' },
          { phone: null }
        ]
      });
      logger.info(`Email only contacts: ${emailOnlyTotal}`);

      // Test phone only query
      const phoneOnlyTotal = await Contact.countDocuments({
        phone: { $exists: true, $ne: '', $ne: null },
        $or: [
          { email: { $exists: false } },
          { email: '' },
          { email: null }
        ]
      });
      logger.info(`Phone only contacts: ${phoneOnlyTotal}`);

      // Sample some contacts to see their actual data
      const sampleContacts = await Contact.find({}).limit(5).lean();
      logger.info('Sample contacts:', sampleContacts.map(c => ({
        source: c.source,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        company: c.company
      })));

      // Check for contacts with phone but no email (should be phone-only)
      const phoneNoEmailSample = await Contact.find({
        phone: { $exists: true, $ne: '', $ne: null },
        $or: [
          { email: { $exists: false } },
          { email: '' },
          { email: null }
        ]
      }).limit(3).lean();
      
      logger.info('Phone but no email samples:', phoneNoEmailSample.map(c => ({
        source: c.source,
        email: c.email,
        phone: c.phone,
        emailExists: !!c.email,
        emailEmpty: c.email === '',
        emailNull: c.email === null
      })));

      // Check for contacts with email but no phone (should be email-only)
      const emailNoPhoneSample = await Contact.find({
        email: { $exists: true, $ne: '', $ne: null },
        $or: [
          { phone: { $exists: false } },
          { phone: '' },
          { phone: null }
        ]
      }).limit(3).lean();
      
      logger.info('Email but no phone samples:', emailNoPhoneSample.map(c => ({
        source: c.source,
        email: c.email,
        phone: c.phone,
        phoneExists: !!c.phone,
        phoneEmpty: c.phone === '',
        phoneNull: c.phone === null
      })));

      res.json({
        success: true,
        debug: {
          totalContacts,
          sourceBreakdown: { hubspotCount, sheetsCount, csvCount },
          fieldExistence: { hasFirstName, hasLastName, hasEmail, hasPhone, hasCompany },
          categoryTotals: { cleanTotal, emailOnlyTotal, phoneOnlyTotal },
          sampleContacts: sampleContacts.map(c => ({
            source: c.source,
            firstName: c.firstName || 'EMPTY',
            lastName: c.lastName || 'EMPTY',
            email: c.email || 'EMPTY',
            phone: c.phone || 'EMPTY',
            company: c.company || 'EMPTY'
          }))
        }
      });
    } catch (error) {
      logger.error('Error in debugContactStats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getContactsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      let filter = {};
      
      switch (category) {
        case 'clean':
          filter = {
            firstName: { $exists: true, $ne: '', $ne: null },
            lastName: { $exists: true, $ne: '', $ne: null },
            email: { $exists: true, $ne: '', $ne: null },
            phone: { $exists: true, $ne: '', $ne: null },
            company: { $exists: true, $ne: '', $ne: null }
          };
          break;
        case 'email-only':
          filter = {
            email: { $exists: true, $ne: '', $ne: null },
            $or: [
              { phone: { $exists: false } },
              { phone: '' },
              { phone: null }
            ]
          };
          break;
        case 'phone-only':
          filter = {
            phone: { $exists: true, $ne: '', $ne: null },
            $or: [
              { email: { $exists: false } },
              { email: '' },
              { email: null }
            ]
          };
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid category'
          });
      }

      const contacts = await Contact.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const total = await Contact.countDocuments(filter);

      res.json({
        success: true,
        data: {
          contacts,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      logger.error('Error in getContactsByCategory:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getCSVUploads(req, res) {
    try {
      logger.info('Getting CSV uploads...');
      
      // Get all unique CSV sources with their metadata
      const csvSources = await Contact.aggregate([
        {
          $match: {
            source: { $regex: '^csv_' }
          }
        },
        {
          $group: {
            _id: '$source',
            contactCount: { $sum: 1 },
            uploadDate: { $min: '$createdAt' },
            lastContact: { $max: '$createdAt' },
            fileName: { $first: '$sourceMetadata.fileName' },
            uploadName: { $first: '$sourceMetadata.uploadName' }
          }
        },
        {
          $sort: { uploadDate: -1 }
        }
      ]);

      logger.info(`Found ${csvSources.length} CSV sources:`, csvSources);

      const formattedSources = csvSources.map(source => ({
        source: source._id,
        contactCount: source.contactCount,
        uploadDate: source.uploadDate,
        lastContact: source.lastContact,
        fileName: source.fileName,
        uploadName: source.uploadName,
        description: `CSV upload with ${source.contactCount} contacts`
      }));

      logger.info('Formatted sources:', formattedSources);

      res.json({
        success: true,
        data: formattedSources
      });
    } catch (error) {
      logger.error('Error in getCSVUploads:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async findDuplicates(req, res) {
    try {
      const { field = 'email' } = req.query;
      const duplicates = await searchService.findDuplicates(field);
      
      res.json({
        success: true,
        data: duplicates
      });
    } catch (error) {
      logger.error('Error in findDuplicates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to find duplicates'
      });
    }
  }

  async bulkUpdate(req, res) {
    try {
      const { contactIds, updates } = req.body;

      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Contact IDs array is required'
        });
      }

      const result = await Contact.updateMany(
        { _id: { $in: contactIds } },
        { ...updates, lastSyncedAt: new Date() }
      );

      res.json({
        success: true,
        data: {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount
        },
        message: `${result.modifiedCount} contacts updated`
      });
    } catch (error) {
      logger.error('Error in bulkUpdate:', error);
      res.status(500).json({
        success: false,
        error: 'Bulk update failed'
      });
    }
  }

  async bulkDelete(req, res) {
    try {
      const { contactIds } = req.body;

      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Contact IDs array is required'
        });
      }

      const result = await Contact.updateMany(
        { _id: { $in: contactIds } },
        { status: 'deleted', lastSyncedAt: new Date() }
      );

      res.json({
        success: true,
        data: {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount
        },
        message: `${result.modifiedCount} contacts marked as deleted`
      });
    } catch (error) {
      logger.error('Error in bulkDelete:', error);
      res.status(500).json({
        success: false,
        error: 'Bulk delete failed'
      });
    }
  }
}

module.exports = new ContactController();