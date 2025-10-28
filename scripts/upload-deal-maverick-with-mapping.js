require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const CSV_FILE = 'Enriched - Deal Maverick-ZoomInfo.csv';

// Field mapping from CSV headers to CRM fields
const fieldMapping = {
  'Fast Name': 'firstName',
  'Last Name': 'lastName',
  'Job Title': 'jobTitle',
  'Email Address': 'email',
  'Personal Phone Number': 'phone',
  'Company Name': 'company',
  'Website URL': 'website',
  'Industry': 'industry',
  'NAICS Code': 'naicsCode',
  'SIC Code': 'sicCode',
  'Company Phone': 'companyPhone',
  'Company Street Address': 'companyStreetAddress',
  'Company City': 'companyCity',
  'Company State': 'companyState',
  'Company Zip Code': 'companyZipCode',
  'Lead Source': 'leadSource',
  'Campaign Category': 'campaignType', // Maps to campaignType field
  'Note': 'notes'
};

async function uploadCSV() {
  try {
    console.log('🚀 Starting CSV upload with field mapping...');
    console.log('File:', CSV_FILE);
    console.log('Field mapping:', JSON.stringify(fieldMapping, null, 2));

    // Check if file exists
    if (!fs.existsSync(CSV_FILE)) {
      console.error(`❌ File not found: ${CSV_FILE}`);
      console.log('Current directory:', process.cwd());
      console.log('Files in current directory:', fs.readdirSync('.').filter(f => f.endsWith('.csv')));
      process.exit(1);
    }

    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(CSV_FILE));
    form.append('sourceName', 'Deal Maverick - ZoomInfo Enriched');
    form.append('fieldMapping', JSON.stringify(fieldMapping));

    console.log('\n📤 Uploading to:', `${API_URL}/contacts/upload`);
    
    // Upload the file
    const response = await axios.post(`${API_URL}/contacts/upload`, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000 // 5 minutes
    });

    if (response.data.success) {
      console.log('\n✅ Upload successful!');
      console.log('\n📊 Stats:');
      console.log('  Total processed:', response.data.data.stats.totalProcessed);
      console.log('  Successful:', response.data.data.stats.successful);
      console.log('  Errors:', response.data.data.stats.errors);
      
      if (response.data.data.stats.parseErrors > 0) {
        console.log('  Parse errors:', response.data.data.stats.parseErrors);
      }

      // Show sample of uploaded contacts
      if (response.data.data.contacts && response.data.data.contacts.length > 0) {
        console.log('\n📋 Sample contacts:');
        response.data.data.contacts.slice(0, 3).forEach((contact, i) => {
          console.log(`\n  Contact ${i + 1}:`);
          console.log('    Name:', contact.firstName, contact.lastName);
          console.log('    Email:', contact.email);
          console.log('    Company:', contact.company);
          console.log('    Campaign Type:', contact.campaignType || 'Not set');
          console.log('    Lead Source:', contact.leadSource || 'Not set');
        });
      }

      console.log('\n🎉 Upload complete! Check your dashboard to see the campaign type breakdown.');
    } else {
      console.error('❌ Upload failed:', response.data.error);
    }

  } catch (error) {
    console.error('❌ Error uploading CSV:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

uploadCSV();
