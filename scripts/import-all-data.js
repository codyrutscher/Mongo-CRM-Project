require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const hubspotService = require('../src/services/hubspotService');
const googleSheetsService = require('../src/services/googleSheetsService');
const Contact = require('../src/models/Contact');

const HUBSPOT_BATCH_SIZE = 1000;
const SHEETS_BATCH_SIZE = 1000;
const CSV_BATCH_SIZE = 500;
const SPREADSHEET_ID = '1htwt_ndpJrEfZCAu_WwIxHJWhz2fCLDRg7hD16K9QoI';

// Stats tracking
const stats = {
  hubspot: { processed: 0, created: 0, updated: 0, errors: 0 },
  googleSheets: { processed: 0, created: 0, updated: 0, errors: 0 },
  csv: { processed: 0, created: 0, updated: 0, errors: 0 },
  total: { processed: 0, created: 0, updated: 0, errors: 0 }
};

async function importHubSpotData() {
  try {
    console.log('\n🔗 === HUBSPOT IMPORT ===');
    console.log('📄 Fetching all HubSpot contacts...');
    
    const allHubSpotContacts = await hubspotService.getAllContacts();
    console.log(`📈 Total HubSpot contacts: ${allHubSpotContacts.length}`);
    
    for (let i = 0; i < allHubSpotContacts.length; i += HUBSPOT_BATCH_SIZE) {
      const batch = allHubSpotContacts.slice(i, i + HUBSPOT_BATCH_SIZE);
      console.log(`🔄 HubSpot batch ${Math.floor(i / HUBSPOT_BATCH_SIZE) + 1}/${Math.ceil(allHubSpotContacts.length / HUBSPOT_BATCH_SIZE)} (${batch.length} contacts)...`);
      
      for (const hubspotContact of batch) {
        try {
          const contactData = hubspotService.transformContactData(hubspotContact);
          
          const existingContact = await Contact.findOne({
            $or: [
              { source: 'hubspot', sourceId: contactData.sourceId },
              { email: contactData.email }
            ]
          });
          
          if (existingContact) {
            Object.assign(existingContact, contactData);
            existingContact.lastSyncedAt = new Date();
            await existingContact.save();
            stats.hubspot.updated++;
          } else {
            const contact = new Contact(contactData);
            await contact.save();
            stats.hubspot.created++;
          }
          
          stats.hubspot.processed++;
          
        } catch (error) {
          stats.hubspot.errors++;
          if (stats.hubspot.errors <= 10) {
            console.error(`❌ HubSpot error:`, error.message);
          }
        }
      }
      
      console.log(`   Progress: ${stats.hubspot.processed}/${allHubSpotContacts.length} | Created: ${stats.hubspot.created} | Updated: ${stats.hubspot.updated} | Errors: ${stats.hubspot.errors}`);
    }
    
    console.log('✅ HubSpot import completed!');
    
  } catch (error) {
    console.error('💥 HubSpot import failed:', error);
  }
}

async function importGoogleSheetsData() {
  try {
    console.log('\n📊 === GOOGLE SHEETS IMPORT ===');
    console.log('📄 Fetching all Google Sheets data...');
    
    const sheetsData = await googleSheetsService.getAllSheetData(SPREADSHEET_ID);
    
    let allContacts = [];
    for (const sheetData of sheetsData) {
      console.log(`📋 Processing sheet: ${sheetData.sheetName} (${sheetData.data.length} rows)`);
      const contacts = googleSheetsService.transformSheetData(sheetData.data);
      allContacts = allContacts.concat(contacts);
    }
    
    console.log(`📈 Total Google Sheets contacts: ${allContacts.length}`);
    
    for (let i = 0; i < allContacts.length; i += SHEETS_BATCH_SIZE) {
      const batch = allContacts.slice(i, i + SHEETS_BATCH_SIZE);
      console.log(`🔄 Sheets batch ${Math.floor(i / SHEETS_BATCH_SIZE) + 1}/${Math.ceil(allContacts.length / SHEETS_BATCH_SIZE)} (${batch.length} contacts)...`);
      
      for (const contactData of batch) {
        try {
          // Handle empty emails
          if (!contactData.email || contactData.email === '') {
            contactData.email = `placeholder_${contactData.sourceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@googlesheets.placeholder`;
          }
          
          const existingContact = await Contact.findOne({
            $or: [
              { source: 'google_sheets', sourceId: contactData.sourceId },
              { email: contactData.email }
            ]
          });
          
          if (existingContact) {
            Object.assign(existingContact, contactData);
            existingContact.lastSyncedAt = new Date();
            await existingContact.save();
            stats.googleSheets.updated++;
          } else {
            const contact = new Contact(contactData);
            await contact.save();
            stats.googleSheets.created++;
          }
          
          stats.googleSheets.processed++;
          
        } catch (error) {
          stats.googleSheets.errors++;
          if (stats.googleSheets.errors <= 10) {
            console.error(`❌ Google Sheets error:`, error.message);
          }
        }
      }
      
      console.log(`   Progress: ${stats.googleSheets.processed}/${allContacts.length} | Created: ${stats.googleSheets.created} | Updated: ${stats.googleSheets.updated} | Errors: ${stats.googleSheets.errors}`);
    }
    
    console.log('✅ Google Sheets import completed!');
    
  } catch (error) {
    console.error('💥 Google Sheets import failed:', error);
  }
}

async function importCSVData(csvFilePath) {
  try {
    console.log('\n📁 === CSV IMPORT ===');
    console.log(`📄 Processing CSV file: ${csvFilePath}`);
    
    if (!fs.existsSync(csvFilePath)) {
      console.log('⚠️  CSV file not found. Please provide the path to your CSV file.');
      console.log('   Usage: node scripts/import-all-data.js /path/to/your/file.csv');
      return;
    }
    
    const csvContacts = [];
    
    // Read and parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv({ skipEmptyLines: true }))
        .on('data', (row) => {
          // Transform CSV row to contact format
          const contact = {
            firstName: row['First Name'] || '',
            lastName: row['Last Name'] || '',
            email: row['Email'] || `placeholder_csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@csv.placeholder`,
            phone: row['Phone Number'] || '',
            company: row['Company'] || '',
            jobTitle: row['Job Title'] || '',
            address: {
              street: row['Street Address'] || '',
              city: row['City'] || '',
              state: row['State/Region'] || '',
              zipCode: row['Postal Code'] || '',
              country: 'United States'
            },
            customFields: {
              sicCode: row['SIC Code'] || '',
              websiteUrl: row['Website URL'] || '',
              businessCategory: row['Business Category / Industry of Interest'] || '',
              numberOfEmployees: row['Number of Employees'] || '',
              linkedinProfile: row['LinkedIn Profile'] || '',
              officePhone: row['Office Phone'] || '',
              leadSource: row['Lead Source'] || '',
              contactType: row['Contact Type'] || '',
              naicsCode: row['NAICS Code'] || '',
              yearEstablished: row['Year Established'] || '',
              phone2: row['Phone 2'] || '',
              phone3: row['Phone 3'] || '',
              priority: row['Priority'] || '',
              notes: row['Notes'] || ''
            },
            source: 'csv_upload',
            sourceId: `csv_${Date.now()}_${csvContacts.length}`,
            lastSyncedAt: new Date(),
            status: 'active',
            lifecycleStage: 'lead'
          };
          
          csvContacts.push(contact);
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📈 Total CSV contacts: ${csvContacts.length}`);
    
    // Process CSV contacts
    for (let i = 0; i < csvContacts.length; i += CSV_BATCH_SIZE) {
      const batch = csvContacts.slice(i, i + CSV_BATCH_SIZE);
      console.log(`🔄 CSV batch ${Math.floor(i / CSV_BATCH_SIZE) + 1}/${Math.ceil(csvContacts.length / CSV_BATCH_SIZE)} (${batch.length} contacts)...`);
      
      for (const contactData of batch) {
        try {
          // For CSV, allow duplicates by checking only sourceId (not email)
          const existingContact = await Contact.findOne({
            source: 'csv_upload',
            sourceId: contactData.sourceId
          });
          
          if (existingContact) {
            Object.assign(existingContact, contactData);
            existingContact.lastSyncedAt = new Date();
            await existingContact.save();
            stats.csv.updated++;
          } else {
            const contact = new Contact(contactData);
            await contact.save();
            stats.csv.created++;
          }
          
          stats.csv.processed++;
          
        } catch (error) {
          stats.csv.errors++;
          if (stats.csv.errors <= 10) {
            console.error(`❌ CSV error:`, error.message);
          }
        }
      }
      
      console.log(`   Progress: ${stats.csv.processed}/${csvContacts.length} | Created: ${stats.csv.created} | Updated: ${stats.csv.updated} | Errors: ${stats.csv.errors}`);
    }
    
    console.log('✅ CSV import completed!');
    
  } catch (error) {
    console.error('💥 CSV import failed:', error);
  }
}

async function main() {
  const csvFilePath = process.argv[2];
  
  console.log('🎯 === COMPLETE DATA IMPORT ===');
  console.log('🔥 Importing ALL data sources directly to MongoDB');
  console.log('📅 Started at:', new Date().toISOString());
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Import all data sources
    await importHubSpotData();
    await importGoogleSheetsData();
    
    if (csvFilePath) {
      await importCSVData(csvFilePath);
    } else {
      console.log('\n📁 No CSV file specified. To include CSV:');
      console.log('   node scripts/import-all-data.js /path/to/your/file.csv');
    }
    
    // Calculate totals
    stats.total.processed = stats.hubspot.processed + stats.googleSheets.processed + stats.csv.processed;
    stats.total.created = stats.hubspot.created + stats.googleSheets.created + stats.csv.created;
    stats.total.updated = stats.hubspot.updated + stats.googleSheets.updated + stats.csv.updated;
    stats.total.errors = stats.hubspot.errors + stats.googleSheets.errors + stats.csv.errors;
    
    // Final statistics
    console.log('\n🎉 === COMPLETE IMPORT SUMMARY ===');
    console.log(`📊 HubSpot:       ${stats.hubspot.processed} processed | ${stats.hubspot.created} created | ${stats.hubspot.updated} updated | ${stats.hubspot.errors} errors`);
    console.log(`📊 Google Sheets: ${stats.googleSheets.processed} processed | ${stats.googleSheets.created} created | ${stats.googleSheets.updated} updated | ${stats.googleSheets.errors} errors`);
    console.log(`📊 CSV:           ${stats.csv.processed} processed | ${stats.csv.created} created | ${stats.csv.updated} updated | ${stats.csv.errors} errors`);
    console.log(`📊 TOTAL:         ${stats.total.processed} processed | ${stats.total.created} created | ${stats.total.updated} updated | ${stats.total.errors} errors`);
    
    // Get final database counts
    const finalCounts = await Contact.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);
    
    console.log('\n🎯 === FINAL DATABASE COUNTS ===');
    finalCounts.forEach(source => {
      console.log(`📈 ${source._id}: ${source.count} contacts`);
    });
    
    const totalContacts = await Contact.countDocuments();
    console.log(`🚀 TOTAL CONTACTS IN DATABASE: ${totalContacts}`);
    console.log('📅 Completed at:', new Date().toISOString());
    
  } catch (error) {
    console.error('💥 Complete import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the complete import
main();