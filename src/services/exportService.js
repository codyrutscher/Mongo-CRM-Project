const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const Contact = require('../models/Contact');
const searchService = require('./searchService');
const logger = require('../utils/logger');

class ExportService {
  constructor() {
    this.exportDir = path.join(__dirname, '../../exports');
    this.ensureExportDir();
  }

  ensureExportDir() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async exportToCSV(filters = {}, options = {}) {
    try {
      const contacts = await this.getContactsForExport(filters, options);
      const csvData = this.convertToCSV(contacts);
      
      const filename = `contacts_export_${Date.now()}.csv`;
      const filePath = path.join(this.exportDir, filename);
      
      fs.writeFileSync(filePath, csvData);
      
      return {
        filename,
        filePath,
        recordCount: contacts.length,
        format: 'CSV'
      };
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  async exportToExcel(filters = {}, options = {}) {
    try {
      const contacts = await this.getContactsForExport(filters, options);
      const workbook = this.convertToExcel(contacts);
      
      const filename = `contacts_export_${Date.now()}.xlsx`;
      const filePath = path.join(this.exportDir, filename);
      
      xlsx.writeFile(workbook, filePath);
      
      return {
        filename,
        filePath,
        recordCount: contacts.length,
        format: 'Excel'
      };
    } catch (error) {
      logger.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  async exportBySegment(segment, format = 'csv') {
    try {
      const result = await searchService.getContactsBySegment(segment, { 
        limit: 100000 // Large limit to get all contacts
      });
      
      const exportOptions = {
        filename: `${segment}_export_${Date.now()}`,
        includeCustomFields: true
      };

      if (format.toLowerCase() === 'excel') {
        return await this.exportToExcel({}, { 
          ...exportOptions, 
          contacts: result.contacts 
        });
      } else {
        return await this.exportToCSV({}, { 
          ...exportOptions, 
          contacts: result.contacts 
        });
      }
    } catch (error) {
      logger.error('Error exporting segment:', error);
      throw error;
    }
  }

  async exportSearchResults(query, filters = {}, format = 'csv') {
    try {
      let result;
      if (query) {
        result = await searchService.textSearch(query, { limit: 100000 });
      } else {
        result = await searchService.advancedSearch(filters, { limit: 100000 });
      }

      const exportOptions = {
        filename: `search_export_${Date.now()}`,
        includeCustomFields: true,
        contacts: result.contacts
      };

      if (format.toLowerCase() === 'excel') {
        return await this.exportToExcel({}, exportOptions);
      } else {
        return await this.exportToCSV({}, exportOptions);
      }
    } catch (error) {
      logger.error('Error exporting search results:', error);
      throw error;
    }
  }

  async getContactsForExport(filters = {}, options = {}) {
    if (options.contacts) {
      return options.contacts;
    }

    const query = searchService.buildFilterQuery(filters);
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 100000)
      .lean();

    return contacts;
  }

  convertToCSV(contacts) {
    if (!contacts || contacts.length === 0) {
      return 'First Name,Last Name,Email,Phone,Company,Job Title,Source,DNC Status,DNC Date,DNC Reason\n';
    }

    // Define CSV headers including DNC information
    const headers = [
      'First Name',
      'Last Name', 
      'Email',
      'Phone',
      'Company',
      'Job Title',
      'Street Address',
      'City',
      'State',
      'Zip Code',
      'Country',
      'Source',
      'Lifecycle Stage',
      'Status',
      'DNC Status',
      'DNC Date',
      'DNC Reason',
      'Compliance Notes',
      'Tags',
      'Created Date',
      'Last Synced'
    ];

    // Add custom fields headers
    const customFieldsSet = new Set();
    contacts.forEach(contact => {
      if (contact.customFields) {
        Object.keys(contact.customFields).forEach(key => {
          customFieldsSet.add(key);
        });
      }
    });
    
    const customFieldHeaders = Array.from(customFieldsSet).sort();
    const allHeaders = [...headers, ...customFieldHeaders];

    // Convert to CSV format
    let csvContent = allHeaders.map(header => `"${header}"`).join(',') + '\n';

    contacts.forEach(contact => {
      const row = [
        this.escapeCSV(contact.firstName || ''),
        this.escapeCSV(contact.lastName || ''),
        this.escapeCSV(contact.email || ''),
        this.escapeCSV(contact.phone || ''),
        this.escapeCSV(contact.company || ''),
        this.escapeCSV(contact.jobTitle || ''),
        this.escapeCSV(contact.address?.street || ''),
        this.escapeCSV(contact.address?.city || ''),
        this.escapeCSV(contact.address?.state || ''),
        this.escapeCSV(contact.address?.zipCode || ''),
        this.escapeCSV(contact.address?.country || ''),
        this.escapeCSV(contact.source || ''),
        this.escapeCSV(contact.lifecycleStage || ''),
        this.escapeCSV(contact.status || ''),
        this.escapeCSV(contact.dncStatus || 'callable'),
        this.escapeCSV(contact.dncDate ? new Date(contact.dncDate).toISOString() : ''),
        this.escapeCSV(contact.dncReason || ''),
        this.escapeCSV(contact.complianceNotes || ''),
        this.escapeCSV(contact.tags?.join('; ') || ''),
        this.escapeCSV(contact.createdAt ? new Date(contact.createdAt).toISOString() : ''),
        this.escapeCSV(contact.lastSyncedAt ? new Date(contact.lastSyncedAt).toISOString() : '')
      ];

      // Add custom fields data
      customFieldHeaders.forEach(fieldName => {
        const value = contact.customFields?.[fieldName] || '';
        row.push(this.escapeCSV(String(value)));
      });

      csvContent += row.join(',') + '\n';
    });

    return csvContent;
  }

  convertToExcel(contacts) {
    if (!contacts || contacts.length === 0) {
      // Create empty workbook
      return xlsx.utils.book_new();
    }

    // Prepare data for Excel
    const excelData = contacts.map(contact => {
      const row = {
        'First Name': contact.firstName || '',
        'Last Name': contact.lastName || '',
        'Email': contact.email || '',
        'Phone': contact.phone || '',
        'Company': contact.company || '',
        'Job Title': contact.jobTitle || '',
        'Street Address': contact.address?.street || '',
        'City': contact.address?.city || '',
        'State': contact.address?.state || '',
        'Zip Code': contact.address?.zipCode || '',
        'Country': contact.address?.country || '',
        'Source': contact.source || '',
        'Lifecycle Stage': contact.lifecycleStage || '',
        'Status': contact.status || '',
        'Tags': contact.tags?.join('; ') || '',
        'Created Date': contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : '',
        'Last Synced': contact.lastSyncedAt ? new Date(contact.lastSyncedAt).toLocaleDateString() : ''
      };

      // Add custom fields
      if (contact.customFields) {
        Object.entries(contact.customFields).forEach(([key, value]) => {
          row[key] = String(value);
        });
      }

      return row;
    });

    // Create worksheet
    const worksheet = xlsx.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 20 }, // Company
      { wch: 20 }, // Job Title
      { wch: 25 }, // Street Address
      { wch: 15 }, // City
      { wch: 10 }, // State
      { wch: 10 }, // Zip Code
      { wch: 15 }, // Country
      { wch: 15 }, // Source
      { wch: 15 }, // Lifecycle Stage
      { wch: 10 }, // Status
      { wch: 20 }, // Tags
      { wch: 12 }, // Created Date
      { wch: 12 }  // Last Synced
    ];

    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Contacts');

    // Add summary sheet
    const summaryData = [
      { Field: 'Total Records', Value: contacts.length },
      { Field: 'Export Date', Value: new Date().toISOString() },
      { Field: 'Active Contacts', Value: contacts.filter(c => c.status === 'active').length },
      { Field: 'Leads', Value: contacts.filter(c => c.lifecycleStage === 'lead').length },
      { Field: 'Prospects', Value: contacts.filter(c => c.lifecycleStage === 'prospect').length },
      { Field: 'Customers', Value: contacts.filter(c => c.lifecycleStage === 'customer').length }
    ];

    const summaryWorksheet = xlsx.utils.json_to_sheet(summaryData);
    xlsx.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    return workbook;
  }

  escapeCSV(value) {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    
    // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  async cleanupOldExports(maxAgeHours = 24) {
    try {
      const files = fs.readdirSync(this.exportDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      let cleanedCount = 0;
      files.forEach(filename => {
        const filePath = path.join(this.exportDir, filename);
        const stats = fs.statSync(filePath);
        
        if (now - stats.birthtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} old export files`);
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up exports:', error);
      return 0;
    }
  }

  async getExportFile(filename) {
    const filePath = path.join(this.exportDir, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('Export file not found');
    }

    const stats = fs.statSync(filePath);
    return {
      filePath,
      size: stats.size,
      created: stats.birthtimeMs
    };
  }
}

module.exports = new ExportService();