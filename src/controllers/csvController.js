const fileUploadService = require('../services/fileUploadService');
const Contact = require('../models/Contact');
const logger = require('../utils/logger');

class CSVController {
  async previewCSVFile(req, res) {
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

      // Parse file and get preview
      const result = await fileUploadService.parseFileForPreview(req.file);
      
      res.json({
        success: true,
        data: {
          headers: result.headers,
          sampleData: result.sampleData,
          totalRows: result.totalRows,
          filename: req.file.originalname
        }
      });
    } catch (error) {
      logger.error('Error previewing CSV file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to preview file'
      });
    }
  }

  async uploadWithMapping(req, res) {
    try {
      const { mapping, filename } = req.body;
      
      if (!mapping || !filename) {
        return res.status(400).json({
          success: false,
          error: 'Mapping and filename are required'
        });
      }

      // Process the uploaded file with the provided mapping
      const result = await fileUploadService.processFileWithMapping(filename, mapping);
      
      // Save contacts to database
      const savedContacts = [];
      const errors = [];

      for (const contactData of result.data) {
        try {
          // Check for existing contact
          const existingContact = await Contact.findOne({ 
            $or: [
              { email: contactData.email },
              { source: contactData.source, sourceId: contactData.sourceId }
            ]
          });
          
          if (existingContact && contactData.email) {
            // Update existing contact
            Object.assign(existingContact, contactData);
            await existingContact.save();
            savedContacts.push(existingContact);
          } else {
            // Create new contact
            const contact = new Contact(contactData);
            await contact.save();
            savedContacts.push(contact);
          }
        } catch (error) {
          errors.push({
            contact: contactData,
            error: error.message
          });
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
          contacts: savedContacts.slice(0, 10), // Only return first 10 for response size
          stats,
          parseErrors: result.errors.slice(0, 10),
          saveErrors: errors.slice(0, 10)
        },
        message: `Upload completed: ${stats.successful} contacts processed`
      });
    } catch (error) {
      logger.error('Error in uploadWithMapping:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process mapped upload'
      });
    }
  }

  getFieldOptions(req, res) {
    const fieldOptions = [
      { value: '', label: '-- Skip this column --' },
      // Core contact fields
      { value: 'firstName', label: 'First Name' },
      { value: 'lastName', label: 'Last Name' },
      { value: 'email', label: 'Email Address' },
      { value: 'phone', label: 'Phone Number' },
      { value: 'company', label: 'Company' },
      { value: 'jobTitle', label: 'Job Title' },
      
      // Address fields
      { value: 'address.street', label: 'Street Address' },
      { value: 'address.city', label: 'City' },
      { value: 'address.state', label: 'State/Province' },
      { value: 'address.zipCode', label: 'Zip/Postal Code' },
      { value: 'address.country', label: 'Country' },
      
      // Business information custom fields
      { value: 'custom.websiteUrl', label: 'Website URL' },
      { value: 'custom.sicCode', label: 'SIC Code' },
      { value: 'custom.naicsCode', label: 'NAICS Code' },
      { value: 'custom.businessCategory', label: 'Business Category/Industry' },
      { value: 'custom.numberOfEmployees', label: 'Number of Employees' },
      { value: 'custom.yearEstablished', label: 'Year Established' },
      
      // Contact information
      { value: 'custom.linkedinProfile', label: 'LinkedIn Profile' },
      { value: 'custom.officePhone', label: 'Office Phone' },
      { value: 'custom.phone2', label: 'Phone 2' },
      { value: 'custom.phone3', label: 'Phone 3' },
      
      // Lead/Sales fields
      { value: 'custom.leadSource', label: 'Lead Source' },
      { value: 'custom.contactType', label: 'Contact Type' },
      { value: 'custom.priority', label: 'Priority' },
      { value: 'custom.notes', label: 'Notes' },
      { value: 'custom.createDate', label: 'Create Date' },
      
      // General options
      { value: 'tags', label: 'Tags (comma-separated)' },
      { value: 'lifecycleStage', label: 'Lifecycle Stage' },
      { value: 'status', label: 'Status' },
      { value: 'custom.other', label: 'Other Custom Field' }
    ];

    res.json({
      success: true,
      data: fieldOptions
    });
  }
}

module.exports = new CSVController();