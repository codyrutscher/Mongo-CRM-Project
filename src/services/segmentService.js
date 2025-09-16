const Segment = require('../models/Segment');
const Contact = require('../models/Contact');
const searchService = require('./searchService');
const logger = require('../utils/logger');

class SegmentService {
  constructor() {
    this.defaultSegments = [
      {
        name: 'All Contacts',
        description: 'All contacts in the database',
        filters: {},
        isSystem: true,
        color: '#007bff',
        icon: 'fas fa-users'
      },
      {
        name: 'HubSpot Contacts',
        description: 'Contacts synced from HubSpot',
        filters: { source: 'hubspot' },
        isSystem: true,
        color: '#ff7a59',
        icon: 'fab fa-hubspot'
      },
      {
        name: 'Google Sheets Contacts',
        description: 'Contacts imported from Google Sheets',
        filters: { source: 'google_sheets' },
        isSystem: true,
        color: '#34a853',
        icon: 'fab fa-google'
      },
      {
        name: 'CSV Uploads',
        description: 'Contacts uploaded via CSV files',
        filters: { source: { $in: ['csv_upload', 'excel_upload'] } },
        isSystem: true,
        color: '#6f42c1',
        icon: 'fas fa-file-csv'
      },
      {
        name: 'New Leads',
        description: 'Leads created in the last 7 days',
        filters: {
          lifecycleStage: 'lead',
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        isSystem: true,
        color: '#28a745',
        icon: 'fas fa-user-plus'
      },
      {
        name: 'Customers',
        description: 'Current customers',
        filters: { lifecycleStage: 'customer' },
        isSystem: true,
        color: '#ffc107',
        icon: 'fas fa-crown'
      },
      {
        name: 'Prospects',
        description: 'Active prospects',
        filters: { lifecycleStage: 'prospect' },
        isSystem: true,
        color: '#17a2b8',
        icon: 'fas fa-eye'
      },
      {
        name: 'High Value Contacts',
        description: 'Contacts from companies with 50+ employees',
        filters: { 'customFields.numberOfEmployees': { $gte: '50' } },
        isSystem: true,
        color: '#dc3545',
        icon: 'fas fa-building'
      },
      {
        name: 'DNC - Do Not Call',
        description: 'Contacts on Do Not Call lists',
        filters: { dncStatus: { $ne: 'callable' } },
        isSystem: true,
        color: '#dc3545',
        icon: 'fas fa-phone-slash'
      },
      {
        name: 'Callable Contacts',
        description: 'Contacts safe to call (not on DNC)',
        filters: { dncStatus: 'callable' },
        isSystem: true,
        color: '#28a745',
        icon: 'fas fa-phone'
      },
      {
        name: 'HubSpot DNC List',
        description: 'Contacts from HubSpot DNC list (ID: 6199)',
        filters: { 
          source: 'hubspot',
          'customFields.hubspotListId': '6199'
        },
        isSystem: true,
        color: '#6f42c1',
        icon: 'fab fa-hubspot'
      }
    ];
  }

  async initializeDefaultSegments() {
    try {
      for (const segmentData of this.defaultSegments) {
        const existing = await Segment.findOne({ name: segmentData.name });
        if (!existing) {
          // Convert filters object to Map for MongoDB
          const segment = new Segment({
            ...segmentData,
            filters: new Map(Object.entries(segmentData.filters))
          });
          await segment.save();
          logger.info(`Created default segment: ${segmentData.name}`);
        }
      }
    } catch (error) {
      logger.error('Error initializing default segments:', error);
    }
  }

  async createSegment(segmentData) {
    try {
      const segment = new Segment({
        name: segmentData.name,
        description: segmentData.description,
        filters: new Map(Object.entries(segmentData.filters || {})),
        createdBy: segmentData.createdBy || 'user',
        isSystem: false,
        color: segmentData.color || '#6c757d',
        icon: segmentData.icon || 'fas fa-users'
      });

      // For contact ID filters, count is the number of IDs
      if (segmentData.filters && segmentData.filters._id && segmentData.filters._id.$in) {
        segment.contactCount = segmentData.filters._id.$in.length;
      } else {
        // Calculate contact count for other filter types
        const count = await this.getSegmentCount(segmentData.filters);
        segment.contactCount = count;
      }

      await segment.save();
      logger.info(`Created custom segment: ${segment.name}`);
      return segment;
    } catch (error) {
      logger.error('Error creating segment:', error);
      throw error;
    }
  }

  async getAllSegments() {
    try {
      const segments = await Segment.find()
        .sort({ isSystem: -1, createdAt: -1 });

      // Update contact counts for all segments
      for (const segment of segments) {
        try {
          const count = await this.getSegmentCount(segment.filters.toObject());
          segment.contactCount = count;
          segment.lastCountUpdate = new Date();
          await segment.save();
        } catch (error) {
          logger.error(`Error updating count for segment ${segment.name}:`, error);
        }
      }

      return segments;
    } catch (error) {
      logger.error('Error fetching segments:', error);
      throw error;
    }
  }

  async getSegmentById(segmentId) {
    try {
      const segment = await Segment.findById(segmentId);
      if (!segment) {
        throw new Error('Segment not found');
      }

      // Handle both Map and Object types for filters
      const filters = segment.filters instanceof Map ? 
        Object.fromEntries(segment.filters) : 
        segment.filters.toObject ? segment.filters.toObject() : segment.filters;

      // Update contact count
      const count = await this.getSegmentCount(filters);
      segment.contactCount = count;
      segment.lastCountUpdate = new Date();
      await segment.save();

      return segment;
    } catch (error) {
      logger.error('Error fetching segment:', error);
      throw error;
    }
  }

  async getSegmentContacts(segmentId, options = {}) {
    try {
      const segment = await Segment.findById(segmentId);
      if (!segment) {
        throw new Error('Segment not found');
      }

      // Handle both Map and Object types for filters
      const filters = segment.filters instanceof Map ? 
        Object.fromEntries(segment.filters) : 
        segment.filters.toObject ? segment.filters.toObject() : segment.filters;

      // Special handling for contact ID-based segments
      if (filters._id && filters._id.$in) {
        // For large ID lists, use more efficient querying
        const totalCount = filters._id.$in.length;
        const limit = options.limit || 50;
        const page = options.page || 1;
        const skip = (page - 1) * limit;

        // Use lean() for better performance on large datasets
        const contacts = await Contact.find({
          _id: { $in: filters._id.$in }
        })
        .sort(options.sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(); // Use lean for better performance

        const totalPages = Math.ceil(totalCount / limit);

        return {
          contacts,
          pagination: {
            current: page,
            total: totalPages,
            count: contacts.length,
            totalRecords: totalCount
          }
        };
      } else {
        // Use search service for other filter types with lean queries for large exports
        const searchOptions = { ...options };
        if (options.limit > 1000) {
          searchOptions.lean = true;
        }
        return await searchService.advancedSearch(filters, searchOptions);
      }
    } catch (error) {
      logger.error('Error fetching segment contacts:', error);
      throw error;
    }
  }

  async getSegmentCount(filters) {
    try {
      const query = searchService.buildFilterQuery(filters);
      return await Contact.countDocuments(query);
    } catch (error) {
      logger.error('Error getting segment count:', error);
      return 0;
    }
  }

  async updateSegment(segmentId, updateData) {
    try {
      const segment = await Segment.findById(segmentId);
      if (!segment) {
        throw new Error('Segment not found');
      }

      if (segment.isSystem) {
        throw new Error('Cannot modify system segments');
      }

      // Update segment data
      Object.assign(segment, updateData);

      // Recalculate contact count if filters changed
      if (updateData.filters) {
        const count = await this.getSegmentCount(updateData.filters);
        segment.contactCount = count;
        segment.lastCountUpdate = new Date();
      }

      await segment.save();
      return segment;
    } catch (error) {
      logger.error('Error updating segment:', error);
      throw error;
    }
  }

  async deleteSegment(segmentId) {
    try {
      const segment = await Segment.findById(segmentId);
      if (!segment) {
        throw new Error('Segment not found');
      }

      if (segment.isSystem) {
        throw new Error('Cannot delete system segments');
      }

      await Segment.findByIdAndDelete(segmentId);
      return { message: 'Segment deleted successfully' };
    } catch (error) {
      logger.error('Error deleting segment:', error);
      throw error;
    }
  }

  async duplicateSegment(segmentId, newName) {
    try {
      const originalSegment = await Segment.findById(segmentId);
      if (!originalSegment) {
        throw new Error('Original segment not found');
      }

      const duplicatedSegment = new Segment({
        name: newName,
        description: `Copy of ${originalSegment.description}`,
        filters: originalSegment.filters,
        createdBy: 'user',
        isSystem: false,
        color: originalSegment.color,
        icon: originalSegment.icon
      });

      const count = await this.getSegmentCount(duplicatedSegment.filters.toObject());
      duplicatedSegment.contactCount = count;

      await duplicatedSegment.save();
      return duplicatedSegment;
    } catch (error) {
      logger.error('Error duplicating segment:', error);
      throw error;
    }
  }

  async getSegmentExportData(segmentId, format = 'csv') {
    try {
      const segment = await Segment.findById(segmentId);
      if (!segment) {
        throw new Error('Segment not found');
      }

      const filters = segment.filters.toObject();
      const contacts = await searchService.advancedSearch(filters, { limit: Number.MAX_SAFE_INTEGER });

      return {
        segmentName: segment.name,
        contacts: contacts.contacts,
        totalCount: contacts.pagination.totalRecords,
        format
      };
    } catch (error) {
      logger.error('Error getting segment export data:', error);
      throw error;
    }
  }

  // Predefined filter templates for easy segment creation
  getFilterTemplates() {
    return [
      {
        name: 'By Source',
        filters: { source: 'hubspot' },
        description: 'Filter contacts by data source'
      },
      {
        name: 'By Company Size',
        filters: { 'customFields.numberOfEmployees': { $gte: '100' } },
        description: 'Companies with 100+ employees'
      },
      {
        name: 'By Industry',
        filters: { 'customFields.businessCategory': { $regex: 'software', $options: 'i' } },
        description: 'Software industry contacts'
      },
      {
        name: 'By Location',
        filters: { 'address.state': 'Texas' },
        description: 'Contacts in Texas'
      },
      {
        name: 'Recent Activity',
        filters: { 
          lastSyncedAt: { 
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
          } 
        },
        description: 'Contacts updated in last 30 days'
      },
      {
        name: 'High Priority',
        filters: { 'customFields.priority': 'High' },
        description: 'High priority contacts'
      },
      {
        name: 'Has LinkedIn',
        filters: { 'customFields.linkedinProfile': { $ne: '', $exists: true } },
        description: 'Contacts with LinkedIn profiles'
      },
      {
        name: 'Missing Email',
        filters: { 
          $or: [
            { email: '' },
            { email: { $regex: 'placeholder.*@.*\.placeholder' } }
          ]
        },
        description: 'Contacts without valid email addresses'
      }
    ];
  }
}

module.exports = new SegmentService();