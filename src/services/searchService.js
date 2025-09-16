const Contact = require('../models/Contact');
const logger = require('../utils/logger');

class SearchService {
  constructor() {
    this.defaultPageSize = 50;
    this.maxPageSize = Number.MAX_SAFE_INTEGER; // No limit for exports
  }

  async searchContacts(query = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultPageSize,
        sort = { createdAt: -1 },
        select = null,
        lean = false
      } = options;

      const actualLimit = Math.min(limit, this.maxPageSize);
      const skip = (page - 1) * actualLimit;

      let contactQuery = Contact.find(query)
        .sort(sort)
        .skip(skip)
        .limit(actualLimit);

      if (select) {
        contactQuery = contactQuery.select(select);
      }

      // Use lean() for better performance on large datasets
      if (lean || actualLimit > 1000) {
        contactQuery = contactQuery.lean();
      }

      const [contacts, total] = await Promise.all([
        contactQuery,
        Contact.countDocuments(query)
      ]);

      return {
        contacts,
        pagination: {
          current: page,
          total: Math.ceil(total / actualLimit),
          count: contacts.length,
          totalRecords: total
        }
      };
    } catch (error) {
      logger.error('Error in searchContacts:', error);
      throw error;
    }
  }

  async textSearch(searchText, options = {}) {
    try {
      if (!searchText || searchText.trim() === '') {
        return this.searchContacts({}, options);
      }

      const query = {
        $text: { $search: searchText }
      };

      // Add text score for relevance sorting
      const searchOptions = {
        ...options,
        sort: { score: { $meta: 'textScore' }, ...options.sort }
      };

      return this.searchContacts(query, searchOptions);
    } catch (error) {
      logger.error('Error in textSearch:', error);
      throw error;
    }
  }

  buildFilterQuery(filters) {
    const query = {};

    // Handle different filter types
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      
      switch (key) {
        case 'source':
          if (Array.isArray(value)) {
            query.source = { $in: value };
          } else if (typeof value === 'object' && value.$regex) {
            query.source = value;
          } else {
            query.source = value;
          }
          break;

        case 'status':
          if (Array.isArray(value)) {
            query.status = { $in: value };
          } else {
            query.status = value;
          }
          break;

        case 'lifecycleStage':
          if (Array.isArray(value)) {
            query.lifecycleStage = { $in: value };
          } else {
            query.lifecycleStage = value;
          }
          break;

        case 'company':
          if (typeof value === 'string') {
            query.company = { $regex: value, $options: 'i' };
          }
          break;

        case 'tags':
          if (Array.isArray(value)) {
            query.tags = { $in: value };
          } else {
            query.tags = value;
          }
          break;

        case 'email':
          query.email = { $regex: value, $options: 'i' };
          break;

        case 'phone':
          query.phone = { $regex: value.replace(/\D/g, '') };
          break;

        case 'city':
          query['address.city'] = { $regex: value, $options: 'i' };
          break;

        case 'state':
          query['address.state'] = { $regex: value, $options: 'i' };
          break;

        case 'country':
          query['address.country'] = { $regex: value, $options: 'i' };
          break;

        case 'dateRange':
          if (value.start || value.end) {
            query.createdAt = {};
            if (value.start) {
              query.createdAt.$gte = new Date(value.start);
            }
            if (value.end) {
              query.createdAt.$lte = new Date(value.end);
            }
          }
          break;

        case 'lastSyncRange':
          if (value.start || value.end) {
            query.lastSyncedAt = {};
            if (value.start) {
              query.lastSyncedAt.$gte = new Date(value.start);
            }
            if (value.end) {
              query.lastSyncedAt.$lte = new Date(value.end);
            }
          }
          break;

        case 'dncStatus':
          if (value === 'callable') {
            // Callable includes both 'callable' and null/undefined (not on DNC list)
            query.dncStatus = { $ne: 'dnc_internal' };
          } else {
            query.dncStatus = value;
          }
          break;

        case 'customFields':
          Object.keys(value).forEach(fieldName => {
            const fieldValue = value[fieldName];
            query[`customFields.${fieldName}`] = { $regex: fieldValue, $options: 'i' };
          });
          break;

        default:
          // Handle custom field searches and other direct field matches
          if (key.startsWith('customFields.')) {
            if (typeof value === 'object' && value.$regex) {
              query[key] = value; // Keep regex objects as-is
            } else if (typeof value === 'string' && value.trim() !== '') {
              // Use regex for partial matching on custom fields
              query[key] = { $regex: value, $options: 'i' };
            }
          } else if (key.startsWith('address.')) {
            // Handle address fields with regex for partial matching
            if (typeof value === 'string' && value.trim() !== '') {
              query[key] = { $regex: value, $options: 'i' };
            }
          } else if (typeof value === 'string' && value.trim() !== '') {
            // Handle other string fields
            if (['firstName', 'lastName', 'jobTitle'].includes(key)) {
              query[key] = { $regex: value, $options: 'i' };
            } else {
              query[key] = value; // Direct match for exact values
            }
          } else if (value !== '' && value !== null && value !== undefined) {
            query[key] = value; // Direct field matches for non-string values
          }
          break;
      }
    });

    return query;
  }

  async advancedSearch(filters = {}, options = {}) {
    try {
      const query = this.buildFilterQuery(filters);
      return this.searchContacts(query, options);
    } catch (error) {
      logger.error('Error in advancedSearch:', error);
      throw error;
    }
  }

  async getContactsBySegment(segmentName, options = {}) {
    try {
      const segments = {
        'new_leads': {
          lifecycleStage: 'lead',
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        'customers': {
          lifecycleStage: 'customer'
        },
        'prospects': {
          lifecycleStage: 'prospect'
        },
        'hubspot_contacts': {
          source: 'hubspot'
        },
        'sheets_contacts': {
          source: 'google_sheets'
        },
        'uploaded_contacts': {
          source: { $regex: '^csv_' }
        },
        'inactive': {
          status: 'inactive'
        },
        'missing_email': {
          $or: [
            { email: '' },
            { email: { $exists: false } }
          ]
        },
        'missing_phone': {
          $or: [
            { phone: '' },
            { phone: { $exists: false } }
          ]
        },
        'needs_attention': {
          $or: [
            { syncErrors: { $ne: [] } },
            { email: '' },
            { firstName: '' },
            { lastName: '' }
          ]
        }
      };

      const query = segments[segmentName];
      if (!query) {
        throw new Error(`Unknown segment: ${segmentName}`);
      }

      return this.searchContacts(query, options);
    } catch (error) {
      logger.error('Error in getContactsBySegment:', error);
      throw error;
    }
  }

  async getAvailableSegments() {
    try {
      const [
        totalContacts,
        newLeads,
        customers,
        prospects,
        hubspotContacts,
        sheetsContacts,
        uploadedContacts,
        inactiveContacts,
        missingEmail,
        missingPhone,
        needsAttention
      ] = await Promise.all([
        Contact.countDocuments({ status: 'active' }),
        Contact.countDocuments({
          lifecycleStage: 'lead',
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }),
        Contact.countDocuments({ lifecycleStage: 'customer' }),
        Contact.countDocuments({ lifecycleStage: 'prospect' }),
        Contact.countDocuments({ source: 'hubspot' }),
        Contact.countDocuments({ source: 'google_sheets' }),
        Contact.countDocuments({ source: { $in: ['csv_upload', 'excel_upload'] } }),
        Contact.countDocuments({ status: 'inactive' }),
        Contact.countDocuments({
          $or: [{ email: '' }, { email: { $exists: false } }]
        }),
        Contact.countDocuments({
          $or: [{ phone: '' }, { phone: { $exists: false } }]
        }),
        Contact.countDocuments({
          $or: [
            { syncErrors: { $ne: [] } },
            { email: '' },
            { firstName: '' },
            { lastName: '' }
          ]
        })
      ]);

      return {
        all_contacts: { count: totalContacts, label: 'All Contacts' },
        new_leads: { count: newLeads, label: 'New Leads (7 days)' },
        customers: { count: customers, label: 'Customers' },
        prospects: { count: prospects, label: 'Prospects' },
        hubspot_contacts: { count: hubspotContacts, label: 'HubSpot Contacts' },
        sheets_contacts: { count: sheetsContacts, label: 'Google Sheets Contacts' },
        uploaded_contacts: { count: uploadedContacts, label: 'Uploaded Contacts' },
        inactive: { count: inactiveContacts, label: 'Inactive Contacts' },
        missing_email: { count: missingEmail, label: 'Missing Email' },
        missing_phone: { count: missingPhone, label: 'Missing Phone' },
        needs_attention: { count: needsAttention, label: 'Needs Attention' }
      };
    } catch (error) {
      logger.error('Error getting available segments:', error);
      throw error;
    }
  }

  async getContactStats() {
    try {
      const [
        total,
        bySource,
        byLifecycleStage,
        byStatus,
        recentActivity,
        cleanContacts,
        emailOnlyContacts,
        phoneOnlyContacts
      ] = await Promise.all([
        Contact.countDocuments(),
        Contact.aggregate([
          { $group: { _id: '$source', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Contact.aggregate([
          { $group: { _id: '$lifecycleStage', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Contact.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Contact.aggregate([
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: -1 } },
          { $limit: 30 }
        ]),
        // Clean Contacts: Must have First Name, Last Name, Email, Phone, and Company
        Contact.countDocuments({
          firstName: { $exists: true, $ne: '', $ne: null },
          lastName: { $exists: true, $ne: '', $ne: null },
          email: { $exists: true, $ne: '', $ne: null },
          phone: { $exists: true, $ne: '', $ne: null },
          company: { $exists: true, $ne: '', $ne: null }
        }),
        // Total Contacts with Email Only (has email but no phone)
        Contact.countDocuments({
          email: { $exists: true, $ne: '', $ne: null },
          $or: [
            { phone: { $exists: false } },
            { phone: '' },
            { phone: null }
          ]
        }),
        // Total Contacts with Phone Only (has phone but no email)
        Contact.countDocuments({
          phone: { $exists: true, $ne: '', $ne: null },
          $or: [
            { email: { $exists: false } },
            { email: '' },
            { email: null }
          ]
        })
      ]);

      return {
        total,
        bySource: bySource.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byLifecycleStage: byLifecycleStage.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentActivity: recentActivity,
        // New dashboard stats
        cleanContacts,
        emailOnlyContacts,
        phoneOnlyContacts
      };
    } catch (error) {
      logger.error('Error getting contact stats:', error);
      throw error;
    }
  }

  async findDuplicates(field = 'email') {
    try {
      const duplicates = await Contact.aggregate([
        {
          $match: {
            [field]: { $ne: '' }
          }
        },
        {
          $group: {
            _id: `$${field}`,
            count: { $sum: 1 },
            contacts: { $push: { id: '$_id', firstName: '$firstName', lastName: '$lastName' } }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return duplicates;
    } catch (error) {
      logger.error('Error finding duplicates:', error);
      throw error;
    }
  }

  async getPopularTags(limit = 20) {
    try {
      const tags = await Contact.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);

      return tags;
    } catch (error) {
      logger.error('Error getting popular tags:', error);
      throw error;
    }
  }
}

module.exports = new SearchService();