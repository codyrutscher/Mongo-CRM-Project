const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class FileUploadService {
  constructor() {
    this.allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
  }

  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return errors;
    }

    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push('Invalid file type. Only CSV and Excel files are allowed');
    }

    return errors;
  }

  async parseCSVFile(filePath, source = 'csv_upload') {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      let totalRows = 0;
      let actualHeaders = [];

      logger.debug('Starting CSV parse for file:', filePath);
      
      // First, read the file raw to check the first few lines
      const firstLines = fs.readFileSync(filePath, 'utf8').split('\n').slice(0, 3);
      logger.debug('First 3 lines of CSV file:', firstLines);
      
      const stream = fs.createReadStream(filePath)
        .pipe(csv({
          skipEmptyLines: true,
          headers: false, // Read headers manually
          separator: ',' // Explicitly set comma as separator
        }))
        .on('data', (row) => {
          totalRows++;
          try {
            const rowValues = Object.values(row);
            
            if (totalRows === 1) {
              // First row should be headers
              actualHeaders = rowValues;
              logger.debug('Headers from first row:', actualHeaders);
              return; // Skip processing first row as data
            }
            
            if (totalRows === 2) {
              logger.debug('Second row (first data row):', rowValues.slice(0, 5));
            }
            
            // Convert array to object using headers
            const rowObj = {};
            actualHeaders.forEach((header, index) => {
              if (header && header.trim()) {
                rowObj[header.trim()] = rowValues[index] || '';
              }
            });
            
            if (totalRows <= 3) {
              logger.debug(`Row ${totalRows} object keys:`, Object.keys(rowObj));
            }
            
            const transformedRow = this.transformRowData(rowObj, source || 'csv_upload');
            if (transformedRow) {
              results.push(transformedRow);
            } else {
              logger.debug(`Row ${totalRows} was not transformed (likely empty or invalid)`);
            }
          } catch (error) {
            logger.debug('Error processing row:', error.message);
            errors.push({
              row: totalRows,
              error: error.message,
              data: row
            });
          }
        })
        .on('end', () => {
          logger.info(`CSV parsing completed: ${results.length} valid records from ${totalRows - 1} data rows (excluding header)`);
          resolve({ data: results, errors });
        })
        .on('error', (error) => {
          logger.error('Error parsing CSV file:', error);
          reject(error);
        });

      // Add timeout handling
      setTimeout(() => {
        if (totalRows === 0) {
          logger.error('CSV parsing timeout - no data received');
          stream.destroy();
          reject(new Error('CSV file appears to be empty or invalid format'));
        }
      }, 10000);
    });
  }

  async parseExcelFile(filePath, source = 'excel_upload') {
    try {
      const workbook = xlsx.readFile(filePath);
      const allData = [];
      const allErrors = [];

      // Process each worksheet
      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        try {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = xlsx.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
          });

          if (jsonData.length === 0) return;

          // First row as headers
          const headers = jsonData[0];
          const dataRows = jsonData.slice(1);

          dataRows.forEach((row, rowIndex) => {
            try {
              const rowObj = {};
              headers.forEach((header, colIndex) => {
                if (header) {
                  rowObj[header] = row[colIndex] || '';
                }
              });

              const transformedRow = this.transformRowData(rowObj, source);
              if (transformedRow) {
                transformedRow.customFields = transformedRow.customFields || {};
                transformedRow.customFields.sheetName = sheetName;
                transformedRow.sourceId = `sheet_${sheetIndex}_row_${rowIndex}`;
                allData.push(transformedRow);
              }
            } catch (error) {
              allErrors.push({
                sheet: sheetName,
                row: rowIndex + 2, // +2 because we skipped header and 0-indexed
                error: error.message,
                data: row
              });
            }
          });
        } catch (error) {
          logger.error(`Error processing sheet ${sheetName}:`, error);
          allErrors.push({
            sheet: sheetName,
            error: error.message
          });
        }
      });

      logger.info(`Parsed ${allData.length} records from Excel file`);
      return { data: allData, errors: allErrors };
    } catch (error) {
      logger.error('Error parsing Excel file:', error);
      throw error;
    }
  }

  transformRowData(row, source) {
    const contact = {};

    // Extract data based on common column names
    Object.keys(row).forEach(key => {
      const value = String(row[key]).trim();
      const normalizedKey = key.toLowerCase().trim();

      switch (normalizedKey) {
        case 'first name':
        case 'firstname':
        case 'fname':
        case 'first_name':
        case 'given name':
        case 'forename':
          contact.firstName = value;
          break;
        case 'last name':
        case 'lastname':
        case 'lname':
        case 'last_name':
        case 'surname':
        case 'family name':
          contact.lastName = value;
          break;
        case 'email':
        case 'email address':
        case 'email_address':
        case 'e-mail':
        case 'mail':
        case 'business_email':
        case 'business email':
        case 'work_email':
        case 'work email':
        case 'primary_email':
        case 'primary email':
          // Handle multiple emails - take the first valid one
          if (value && value.includes(',')) {
            const emails = value.split(',').map(e => e.trim()).filter(e => e && this.isValidEmail(e));
            contact.email = emails.length > 0 ? emails[0].toLowerCase() : '';
          } else {
            contact.email = value.toLowerCase();
          }
          break;
        case 'phone':
        case 'phone number':
        case 'mobile':
        case 'phone_number':
        case 'business_phone':
        case 'business phone':
        case 'work_phone':
        case 'work phone':
        case 'company_phone':
        case 'company phone':
        case 'primary_phone':
        case 'primary phone':
          // Handle multiple phone numbers - take the first one
          if (value && value.includes(',')) {
            const phones = value.split(',').map(p => p.trim()).filter(p => p);
            contact.phone = phones.length > 0 ? phones[0] : '';
          } else {
            contact.phone = value;
          }
          break;
        case 'company':
        case 'organization':
        case 'company name':
        case 'company_name':
        case 'business_name':
        case 'business name':
          contact.company = value;
          break;
        case 'job title':
        case 'jobtitle':
        case 'title':
        case 'position':
        case 'job_title':
          contact.jobTitle = value;
          break;
        case 'address':
        case 'street':
        case 'street address':
          contact.address = contact.address || {};
          contact.address.street = value;
          break;
        case 'city':
          contact.address = contact.address || {};
          contact.address.city = value;
          break;
        case 'state':
        case 'province':
        case 'region':
        case 'state/region':
          contact.address = contact.address || {};
          contact.address.state = value;
          break;
        case 'zip':
        case 'zipcode':
        case 'postal code':
        case 'postcode':
        case 'zip_code':
          contact.address = contact.address || {};
          contact.address.zipCode = value;
          break;
        case 'country':
          contact.address = contact.address || {};
          contact.address.country = value;
          break;
        case 'tags':
        case 'categories':
          if (value) {
            contact.tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
          }
          break;
        case 'status':
          if (['active', 'inactive'].includes(value.toLowerCase())) {
            contact.status = value.toLowerCase();
          }
          break;
        case 'lifecycle stage':
        case 'lifecycle_stage':
        case 'stage':
          const stage = value.toLowerCase();
          if (['lead', 'prospect', 'customer', 'evangelist'].includes(stage)) {
            contact.lifecycleStage = stage;
          }
          break;
        // Business-specific fields from your CSV
        case 'website url':
        case 'website':
          contact.customFields = contact.customFields || {};
          contact.customFields.websiteUrl = value;
          break;
        case 'sic code':
          contact.customFields = contact.customFields || {};
          contact.customFields.sicCode = value;
          break;
        case 'naics code':
          contact.customFields = contact.customFields || {};
          contact.customFields.naicsCode = value;
          break;
        case 'business category / industry of interest':
        case 'industry':
        case 'business category':
          contact.customFields = contact.customFields || {};
          contact.customFields.businessCategory = value;
          break;
        case 'number of employees':
        case 'employees':
          contact.customFields = contact.customFields || {};
          contact.customFields.numberOfEmployees = value;
          break;
        case 'linkedin profile':
        case 'linkedin':
          contact.customFields = contact.customFields || {};
          contact.customFields.linkedinProfile = value;
          break;
        case 'office phone':
          contact.customFields = contact.customFields || {};
          contact.customFields.officePhone = value;
          break;
        case 'phone 2':
          contact.customFields = contact.customFields || {};
          contact.customFields.phone2 = value;
          break;
        case 'phone 3':
          contact.customFields = contact.customFields || {};
          contact.customFields.phone3 = value;
          break;
        case 'lead source':
        case 'source':
          contact.customFields = contact.customFields || {};
          contact.customFields.leadSource = value;
          break;
        case 'contact type':
        case 'type':
          contact.customFields = contact.customFields || {};
          contact.customFields.contactType = value;
          break;
        case 'year established':
        case 'founded':
          contact.customFields = contact.customFields || {};
          contact.customFields.yearEstablished = value;
          break;
        case 'priority':
          contact.customFields = contact.customFields || {};
          contact.customFields.priority = value;
          break;
        case 'notes':
          contact.customFields = contact.customFields || {};
          contact.customFields.notes = value;
          break;
        default:
          // Store unknown fields in customFields
          if (value) {
            contact.customFields = contact.customFields || {};
            contact.customFields[key] = value;
          }
          break;
      }
    });

    logger.debug(`Processed contact fields: firstName="${contact.firstName}", lastName="${contact.lastName}", email="${contact.email}"`);

    // Validation and defaults - require at least some meaningful data
    const hasName = (contact.firstName && contact.firstName.trim()) || (contact.lastName && contact.lastName.trim());
    const hasEmail = contact.email && contact.email.trim() && contact.email !== '';
    const hasPhone = contact.phone && contact.phone.trim() && contact.phone !== '';
    const hasCompany = contact.company && contact.company.trim() && contact.company !== '';
    
    if (!hasName && !hasEmail && !hasPhone && !hasCompany) {
      logger.debug(`Skipping record - no meaningful data found. Available columns: ${JSON.stringify(Object.keys(row))}`);
      logger.debug(`Mapped contact data: ${JSON.stringify(contact)}`);
      return null; // Skip empty records
    }

    // Set defaults
    contact.firstName = contact.firstName || '';
    contact.lastName = contact.lastName || '';
    contact.email = contact.email || '';
    contact.source = source;
    contact.sourceId = contact.sourceId || `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    contact.lastSyncedAt = new Date();
    contact.status = contact.status || 'active';
    contact.lifecycleStage = contact.lifecycleStage || 'lead';
    
    // Add upload batch identifier for segmentation
    contact.customFields = contact.customFields || {};
    contact.customFields.uploadBatch = `batch_${Date.now()}`;
    contact.customFields.uploadTimestamp = new Date().toISOString();

    // Basic email validation
    if (contact.email && !this.isValidEmail(contact.email)) {
      throw new Error(`Invalid email format: ${contact.email}`);
    }

    return contact;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info(`Cleaned up file: ${filePath}`);
      }
    } catch (error) {
      logger.error(`Error cleaning up file ${filePath}:`, error);
    }
  }

  async processUploadedFile(file, source = 'csv_upload') {
    const filePath = file.path;
    let result;

    try {
      logger.info(`=== FILE UPLOAD SERVICE DEBUG ===`);
      logger.info(`File path: ${filePath}`);
      logger.info(`File mimetype: ${file.mimetype}`);
      logger.info(`Source: ${source}`);

      if (file.mimetype === 'text/csv') {
        logger.info(`Processing as CSV file...`);
        result = await this.parseCSVFile(filePath, source);
      } else {
        logger.info(`Processing as Excel file...`);
        result = await this.parseExcelFile(filePath, source);
      }

      logger.info(`File processing result:`, {
        dataRows: result.data?.length || 0,
        errorRows: result.errors?.length || 0
      });

      return result;
    } catch (error) {
      logger.error(`Error in processUploadedFile:`, error);
      throw error;
    } finally {
      // Clean up uploaded file
      await this.cleanupFile(filePath);
    }
  }

  async parseFileForPreview(file) {
    const filePath = file.path;
    
    try {
      if (file.mimetype === 'text/csv') {
        return await this.parseCSVForPreview(filePath);
      } else {
        return await this.parseExcelForPreview(filePath);
      }
    } catch (error) {
      logger.error('Error parsing file for preview:', error);
      throw error;
    }
  }

  async parseCSVForPreview(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      let headers = [];
      let rowCount = 0;

      fs.createReadStream(filePath)
        .pipe(csv({ 
          skipEmptyLines: true,
          headers: false // Get raw headers
        }))
        .on('data', (row) => {
          if (rowCount === 0) {
            headers = Object.values(row);
          } else if (rowCount <= 5) {
            results.push(Object.values(row));
          }
          rowCount++;
        })
        .on('end', () => {
          resolve({
            headers,
            sampleData: results,
            totalRows: rowCount - 1 // Subtract header row
          });
        })
        .on('error', reject);
    });
  }

  async parseExcelForPreview(filePath) {
    try {
      const workbook = xlsx.readFile(filePath);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: ''
      });

      const headers = jsonData[0] || [];
      const sampleData = jsonData.slice(1, 6); // First 5 data rows
      
      return {
        headers,
        sampleData,
        totalRows: jsonData.length - 1 // Subtract header row
      };
    } catch (error) {
      logger.error('Error parsing Excel file for preview:', error);
      throw error;
    }
  }

  async processFileWithMapping(filePath, mapping) {
    try {
      let rawData;
      
      // Determine file type and parse
      if (filePath.endsWith('.csv')) {
        rawData = await this.parseCSVForMapping(filePath);
      } else {
        rawData = await this.parseExcelForMapping(filePath);
      }
      
      // Transform data using custom mapping
      const transformedData = this.transformDataWithMapping(rawData, mapping);
      
      return {
        data: transformedData,
        errors: []
      };
    } catch (error) {
      logger.error('Error processing file with mapping:', error);
      throw error;
    }
  }

  async parseCSVForMapping(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      let headers = [];

      fs.createReadStream(filePath)
        .pipe(csv({ 
          skipEmptyLines: true,
          headers: false
        }))
        .on('data', (row) => {
          if (headers.length === 0) {
            headers = Object.values(row);
          } else {
            const rowObj = {};
            headers.forEach((header, index) => {
              rowObj[header] = row[index] || '';
            });
            results.push(rowObj);
          }
        })
        .on('end', () => {
          resolve({ headers, data: results });
        })
        .on('error', reject);
    });
  }

  async parseExcelForMapping(filePath) {
    const workbook = xlsx.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: ''
    });

    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);
    
    const data = dataRows.map(row => {
      const rowObj = {};
      headers.forEach((header, index) => {
        rowObj[header] = row[index] || '';
      });
      return rowObj;
    });

    return { headers, data };
  }

  transformDataWithMapping(rawData, mapping) {
    return rawData.data.map((row, index) => {
      const contact = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        jobTitle: '',
        address: {},
        customFields: {},
        source: 'csv_upload',
        sourceId: `csv_${Date.now()}_${index}`,
        lastSyncedAt: new Date(),
        status: 'active',
        lifecycleStage: 'lead'
      };

      // Apply mapping
      Object.entries(mapping).forEach(([csvColumn, field]) => {
        const value = String(row[csvColumn] || '').trim();
        if (!value) return;

        if (field.startsWith('custom.')) {
          // Handle custom fields
          const customFieldName = field.replace('custom.', '');
          contact.customFields[customFieldName] = value;
        } else if (field.startsWith('address.')) {
          // Handle address fields
          const addressField = field.replace('address.', '');
          contact.address[addressField] = value;
        } else {
          // Handle direct fields
          contact[field] = value;
        }
      });

      return contact;
    }).filter(contact => 
      // Keep contacts that have at least name OR email
      contact.firstName || contact.lastName || contact.email
    );
  }

  getUploadStats(data, errors) {
    return {
      totalProcessed: data.length + errors.length,
      successCount: data.length,
      errorCount: errors.length,
      errors: errors.slice(0, 10) // Only return first 10 errors for preview
    };
  }
}

module.exports = new FileUploadService();