const mongoose = require('mongoose');
require('dotenv').config();
const Contact = require('./src/models/Contact');
const exportService = require('./src/services/exportService');
const searchService = require('./src/services/searchService');

async function testAllContactsExport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Count all contacts by source
    console.log('\n=== CONTACT COUNTS BY SOURCE ===');
    const counts = {
      hubspot: await Contact.countDocuments({ source: 'hubspot', status: { $ne: 'deleted' } }),
      csv: await Contact.countDocuments({ source: 'csv_upload', status: { $ne: 'deleted' } }),
      sheets: await Contact.countDocuments({ source: 'google_sheets', status: { $ne: 'deleted' } }),
      total: await Contact.countDocuments({ status: { $ne: 'deleted' } })
    };
    
    console.log(`HubSpot: ${counts.hubspot.toLocaleString()}`);
    console.log(`CSV: ${counts.csv.toLocaleString()}`);
    console.log(`Google Sheets: ${counts.sheets.toLocaleString()}`);
    console.log(`TOTAL: ${counts.total.toLocaleString()}`);
    
    // Test search service with unlimited limit
    console.log('\n=== TESTING SEARCH SERVICE ===');
    const searchResult = await searchService.advancedSearch({}, { 
      limit: Number.MAX_SAFE_INTEGER,
      page: 1 
    });
    
    console.log(`Search service returned: ${searchResult.contacts.length.toLocaleString()} contacts`);
    console.log(`Pagination total records: ${searchResult.pagination.totalRecords.toLocaleString()}`);
    
    // Test export service with all contacts
    console.log('\n=== TESTING EXPORT SERVICE ===');
    console.log('Starting CSV export of ALL contacts...');
    
    const startTime = Date.now();
    const exportResult = await exportService.exportToCSV({}, {
      filename: 'all_contacts_test',
      includeCustomFields: true
    });
    const endTime = Date.now();
    
    console.log(`Export completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    console.log(`Export file: ${exportResult.filename}`);
    console.log(`File path: ${exportResult.filePath}`);
    
    // Check file size
    const fs = require('fs');
    const stats = fs.statSync(exportResult.filePath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`File size: ${fileSizeInMB} MB`);
    
    // Count lines in the exported file (excluding header)
    const fileContent = fs.readFileSync(exportResult.filePath, 'utf8');
    const lineCount = fileContent.split('\n').length - 2; // Subtract header and empty last line
    console.log(`Exported records: ${lineCount.toLocaleString()}`);
    
    // Verify the export matches our database count
    if (lineCount === counts.total) {
      console.log('✅ SUCCESS: Export count matches database count!');
    } else {
      console.log(`⚠️  WARNING: Export count (${lineCount}) does not match database count (${counts.total})`);
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAllContactsExport();