const logger = require('../utils/logger');

class FieldMappingService {
  constructor() {
    // NAICS Standard Field Order (from CSV template)
    this.naicsFields = [
      'firstName',
      'lastName', 
      'jobTitle',
      'contactLinkedInProfile',
      'email',
      'phone',
      'company',
      'companyWebsiteURL',
      'industry',
      'naicsCode',
      'numberOfEmployees',
      'yearCompanyEstablished',
      'companyPhoneNumber',
      'companyStreetAddress',
      'companyCity',
      'companyState',
      'companyZipCode',
      'leadSource',
      'campaignCategory',
      'lastCampaignDate'
    ];

    // CSV Header Mappings (various possible CSV headers → NAICS standard)
    this.csvMappings = {
      // Name fields
      'first name': 'firstName',
      'firstname': 'firstName',
      'first_name': 'firstName',
      'fname': 'firstName',
      'last name': 'lastName',
      'lastname': 'lastName',
      'last_name': 'lastName',
      'lname': 'lastName',
      'surname': 'lastName',
      
      // Contact fields
      'job title': 'jobTitle',
      'jobtitle': 'jobTitle',
      'job_title': 'jobTitle',
      'title': 'jobTitle',
      'position': 'jobTitle',
      'contact linkedin profile': 'contactLinkedInProfile',
      'linkedin': 'contactLinkedInProfile',
      'linkedin_url': 'contactLinkedInProfile',
      'email address': 'email',
      'email_address': 'email',
      'emailaddress': 'email',
      'e-mail': 'email',
      'phone number': 'phone',
      'phone_number': 'phone',
      'phonenumber': 'phone',
      'telephone': 'phone',
      'mobile': 'phone',
      
      // Company fields
      'company name': 'company',
      'company_name': 'company',
      'companyname': 'company',
      'organization': 'company',
      'business': 'company',
      'company website url': 'companyWebsiteURL',
      'website': 'companyWebsiteURL',
      'company_website': 'companyWebsiteURL',
      'url': 'companyWebsiteURL',
      'naics code': 'naicsCode',
      'naics_code': 'naicsCode',
      'naicscode': 'naicsCode',
      'number of employees': 'numberOfEmployees',
      'employees': 'numberOfEmployees',
      'employee_count': 'numberOfEmployees',
      'company_size': 'numberOfEmployees',
      'year company established': 'yearCompanyEstablished',
      'established': 'yearCompanyEstablished',
      'founded': 'yearCompanyEstablished',
      'year_founded': 'yearCompanyEstablished',
      'company phone number': 'companyPhoneNumber',
      'company_phone': 'companyPhoneNumber',
      'main_phone': 'companyPhoneNumber',
      
      // Address fields
      'company street address': 'companyStreetAddress',
      'address': 'companyStreetAddress',
      'street': 'companyStreetAddress',
      'street_address': 'companyStreetAddress',
      'company city': 'companyCity',
      'city': 'companyCity',
      'company state': 'companyState',
      'state': 'companyState',
      'province': 'companyState',
      'company zip code': 'companyZipCode',
      'zip': 'companyZipCode',
      'zipcode': 'companyZipCode',
      'postal_code': 'companyZipCode',
      
      // Lead fields
      'lead source': 'leadSource',
      'lead_source': 'leadSource',
      'source': 'leadSource',
      'campaign category': 'campaignCategory',
      'campaign': 'campaignCategory',
      'campaign_type': 'campaignCategory',
      'last campaign date': 'lastCampaignDate',
      'campaign_date': 'lastCampaignDate',
      'last_contact': 'lastCampaignDate'
    };

    // HubSpot Field Mappings (based on hubspotprospere.csv)
    this.hubspotMappings = {
      // Personal Information
      'firstname': 'firstName',
      'lastname': 'lastName',
      'jobtitle': 'jobTitle',
      'linkedin_profile_url': 'contactLinkedInProfile',
      'email': 'email',
      'phone': 'phone',
      
      // Company Information
      'company': 'company',
      'website': 'companyWebsiteURL',
      'business_category___industry_of_interest': 'industry',
      'naics_code': 'naicsCode',
      'numemployees': 'numberOfEmployees',
      'year_established': 'yearCompanyEstablished',
      'office_phone': 'companyPhoneNumber',
      'address': 'companyStreetAddress',
      'city': 'companyCity',
      'state': 'companyState',
      'zip': 'companyZipCode',
      
      // Lead Information
      'lead_source': 'leadSource',
      'contact_type': 'campaignCategory',
      'hs_email_last_send_date': 'lastCampaignDate'
    };

    // Google Sheets Field Mappings (C17 Leads)
    this.sheetsMappings = {
      'first name': 'firstName',
      'last name': 'lastName',
      'title': 'jobTitle',
      'email': 'email',
      'phone': 'phone',
      'company': 'company',
      'website': 'companyWebsiteURL',
      'industry': 'industry',
      'employees': 'numberOfEmployees',
      'address': 'companyStreetAddress',
      'city': 'companyCity',
      'state': 'companyState',
      'zip': 'companyZipCode',
      'source': 'leadSource'
    };
  }

  // Map CSV headers to NAICS standard fields
  mapCSVHeaders(headers) {
    const mappedHeaders = {};
    
    headers.forEach((header, index) => {
      const cleanHeader = header.toLowerCase().trim();
      const mappedField = this.csvMappings[cleanHeader] || header;
      mappedHeaders[index] = mappedField;
    });

    logger.info('CSV Header Mapping:', mappedHeaders);
    return mappedHeaders;
  }

  // Map CSV row data to NAICS standard contact object
  mapCSVRowToContact(row, headerMapping, source = 'csv_upload') {
    const contact = {
      source,
      sourceId: `${source}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      leadSource: source
    };

    // Map each field according to header mapping
    Object.keys(headerMapping).forEach(index => {
      const naicsField = headerMapping[index];
      const value = row[index];
      
      if (value && value.trim() !== '') {
        if (naicsField === 'lastCampaignDate' && value) {
          contact[naicsField] = new Date(value);
        } else {
          contact[naicsField] = value.trim();
        }
      }
    });

    // Set default values for required fields
    contact.firstName = contact.firstName || '';
    contact.lastName = contact.lastName || '';
    contact.email = contact.email || `noemail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@placeholder.com`;

    return contact;
  }

  // Map HubSpot contact to NAICS standard
  mapHubSpotToContact(hubspotContact) {
    const contact = {
      source: 'hubspot',
      sourceId: hubspotContact.id.toString(),
      leadSource: 'hubspot'
    };

    // Map HubSpot properties to NAICS fields
    Object.keys(this.hubspotMappings).forEach(hubspotField => {
      const naicsField = this.hubspotMappings[hubspotField];
      const value = hubspotContact.properties[hubspotField];
      
      if (value) {
        contact[naicsField] = value;
      }
    });

    // Set defaults
    contact.firstName = contact.firstName || '';
    contact.lastName = contact.lastName || '';
    contact.email = contact.email || `hubspot_${contact.sourceId}@placeholder.com`;

    return contact;
  }

  // Map Google Sheets row to NAICS standard
  mapSheetsToContact(sheetsRow, headerMapping) {
    const contact = {
      source: 'google_sheets',
      sourceId: `sheets_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      leadSource: 'google_sheets'
    };

    // Map sheets data to NAICS fields
    Object.keys(headerMapping).forEach(sheetsField => {
      const naicsField = this.sheetsMappings[sheetsField.toLowerCase()] || sheetsField;
      const value = sheetsRow[sheetsField];
      
      if (value && value.trim() !== '') {
        contact[naicsField] = value.trim();
      }
    });

    // Set defaults
    contact.firstName = contact.firstName || '';
    contact.lastName = contact.lastName || '';
    contact.email = contact.email || `sheets_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@placeholder.com`;

    return contact;
  }

  // Generate NAICS standard CSV export headers (matching template exactly)
  getExportHeaders() {
    return [
      'First Name',
      'Last Name', 
      'Job Title',
      'Contact LinkedIn Profile',
      'Email Address',
      'Phone Number',
      'Company Name',
      'Company Website URL',
      'Industry',
      'NAICS Code',
      'Number of Employees',
      'Year Company Established ',
      'Company Phone Number',
      'Company Street Address',
      'Company City',
      'Company State',
      'Company Zip Code',
      'Lead Source',
      'Campaign Category',
      'Last Campaign Date'
    ];
  }

  // Convert contact to NAICS standard CSV row
  contactToCSVRow(contact) {
    return [
      contact.firstName || '',
      contact.lastName || '',
      contact.jobTitle || '',
      contact.contactLinkedInProfile || '',
      contact.email || '',
      contact.phone || '',
      contact.company || '',
      contact.companyWebsiteURL || '',
      contact.industry || '',
      contact.naicsCode || '',
      contact.numberOfEmployees || '',
      contact.yearCompanyEstablished || '',
      contact.companyPhoneNumber || '',
      contact.companyStreetAddress || '',
      contact.companyCity || '',
      contact.companyState || '',
      contact.companyZipCode || '',
      contact.leadSource || '',
      contact.campaignCategory || '',
      contact.lastCampaignDate ? contact.lastCampaignDate.toISOString().split('T')[0] : ''
    ];
  }
}

module.exports = new FieldMappingService();