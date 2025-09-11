const { google } = require('googleapis');
const logger = require('../utils/logger');

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.initializeAuth();
  }

  initializeAuth() {
    try {
      if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        logger.warn('Google Sheets credentials not configured');
        return;
      }

      this.auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets.readonly']
      );

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      logger.info('Google Sheets service initialized');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets auth:', error);
    }
  }

  async getSheetData(spreadsheetId, range = 'Sheet1') {
    try {
      if (!this.sheets) {
        throw new Error('Google Sheets service not initialized');
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      return response.data.values || [];
    } catch (error) {
      logger.error('Error reading Google Sheet:', error);
      throw error;
    }
  }

  async getSheetMetadata(spreadsheetId) {
    try {
      if (!this.sheets) {
        throw new Error('Google Sheets service not initialized');
      }

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount
        }))
      };
    } catch (error) {
      logger.error('Error getting sheet metadata:', error);
      throw error;
    }
  }

  async getAllSheetData(spreadsheetId, sheetName = null) {
    try {
      const metadata = await this.getSheetMetadata(spreadsheetId);
      const sheets = sheetName ? 
        metadata.sheets.filter(s => s.title === sheetName) : 
        metadata.sheets;

      const allData = [];

      for (const sheet of sheets) {
        const range = `${sheet.title}!A:Z`;
        const data = await this.getSheetData(spreadsheetId, range);
        
        if (data.length > 0) {
          allData.push({
            sheetName: sheet.title,
            data: data
          });
        }
      }

      return allData;
    } catch (error) {
      logger.error('Error getting all sheet data:', error);
      throw error;
    }
  }

  transformSheetData(sheetData, headerRow = 0) {
    if (!sheetData || sheetData.length <= headerRow) {
      return [];
    }

    const headers = sheetData[headerRow];
    const dataRows = sheetData.slice(headerRow + 1);

    return dataRows.map((row, index) => {
      const contact = {};
      
      headers.forEach((header, colIndex) => {
        const value = row[colIndex] || '';
        const normalizedHeader = header.toLowerCase().trim();
        
        switch (normalizedHeader) {
          case 'first name':
          case 'firstname':
          case 'fname':
            contact.firstName = value.trim();
            break;
          case 'last name':
          case 'lastname':
          case 'lname':
            contact.lastName = value.trim();
            break;
          case 'email':
          case 'email address':
            contact.email = value.trim().toLowerCase();
            break;
          case 'phone':
          case 'phone number':
          case 'mobile':
            contact.phone = value.trim();
            break;
          case 'company':
          case 'organization':
            contact.company = value.trim();
            break;
          case 'job title':
          case 'jobtitle':
          case 'title':
          case 'position':
            contact.jobTitle = value.trim();
            break;
          case 'address':
          case 'street':
            contact.address = contact.address || {};
            contact.address.street = value.trim();
            break;
          case 'city':
            contact.address = contact.address || {};
            contact.address.city = value.trim();
            break;
          case 'state':
          case 'province':
            contact.address = contact.address || {};
            contact.address.state = value.trim();
            break;
          case 'zip':
          case 'zipcode':
          case 'postal code':
            contact.address = contact.address || {};
            contact.address.zipCode = value.trim();
            break;
          case 'country':
            contact.address = contact.address || {};
            contact.address.country = value.trim();
            break;
          default:
            // Store unknown fields in customFields, but skip empty field names
            if (value && header && header.trim()) {
              contact.customFields = contact.customFields || {};
              contact.customFields[header.trim()] = value;
            }
            break;
        }
      });

      // Set default values and source info
      contact.source = 'google_sheets';
      contact.sourceId = `sheet_${index}`;
      contact.lastSyncedAt = new Date();
      
      // Ensure required fields have defaults
      contact.firstName = contact.firstName || '';
      contact.lastName = contact.lastName || '';
      contact.email = contact.email || '';
      
      // If email is empty, generate a unique placeholder to avoid index conflicts
      if (!contact.email) {
        contact.email = `placeholder_${contact.sourceId}_${Date.now()}@googlesheets.placeholder`;
      }

      return contact;
    }).filter(contact => contact.firstName || contact.lastName || contact.email);
  }

  async testConnection(spreadsheetId) {
    try {
      if (!this.sheets) {
        throw new Error('Google Sheets service not initialized');
      }

      await this.getSheetMetadata(spreadsheetId);
      logger.info('Google Sheets connection test successful');
      return true;
    } catch (error) {
      logger.error('Google Sheets connection test failed:', error);
      return false;
    }
  }

  extractSpreadsheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  }
}

module.exports = new GoogleSheetsService();