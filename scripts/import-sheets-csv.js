require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const googleSheetsService = require('../src/services/googleSheetsService');
const Contact = require('../src/models/Contact');

const SPREADSHEET_ID = '1htwt_ndpJrEfZCAu_WwIxHJWhz2fCLDRg7hD16K9QoI';
const BATCH_SIZE = 500;

const stats = {
  googleSheets: { processed: 0, created: 0, updated: 0, errors: 0 },
  csv: { processed: 0, created: 0, updated: 0, errors: 0 }
};

async function importGoogleSheets() {
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
    
    for (let i = 0; i < allContacts.length; i += BATCH_SIZE) {
      const batch = allContacts.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Sheets batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allContacts.length / BATCH_SIZE)}`);
      
      for (const contactData of batch) {
        try {
          // Handle empty emails with unique placeholders
          if (!contactData.email || contactData.email === '') {
            contactData.email = `placeholder_${contactData.sourceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@googlesheets.placeholder`;
          }
          
          // Check existing by sourceId only to avoid email conflicts
          const existingContact = await Contact.findOne({
            source: 'google_sheets',
            sourceId: contactData.sourceId
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
          
          if (stats.googleSheets.processed % 1000 === 0) {
            console.log(`   Progress: ${stats.googleSheets.processed}/${allContacts.length} | Created: ${stats.googleSheets.created} | Updated: ${stats.googleSheets.updated}`);
          }
          
        } catch (error) {
          stats.googleSheets.errors++;
          if (stats.googleSheets.errors <= 5) {
            console.error(`❌ Sheets error:`, error.message);
          }
        }
      }
    }
    
    console.log('✅ Google Sheets import completed!');
    
  } catch (error) {
    console.error('💥 Google Sheets import failed:', error);
  }
}

async function importCSV(csvFilePath) {
  try {
    console.log('\n📁 === CSV IMPORT ===');
    console.log(`📄 Processing CSV: ${csvFilePath}`);
    
    if (!fs.existsSync(csvFilePath)) {
      console.log('❌ CSV file not found');
      return;
    }
    
    const csvContacts = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv({ skipEmptyLines: true }))
        .on('data', (row) => {
          const contact = {
            firstName: row['First Name'] || '',
            lastName: row['Last Name'] || '',
            email: row['Email'] || `placeholder_csv_${Date.now()}_${csvContacts.length}@csv.placeholder`,
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
              notes: row['Notes'] || '',
              createDate: row['Create Date'] || ''
            },
            source: 'csv_upload',
            sourceId: `csv_direct_${Date.now()}_${csvContacts.length}`,
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
    
    for (let i = 0; i < csvContacts.length; i += BATCH_SIZE) {
      const batch = csvContacts.slice(i, i + BATCH_SIZE);
      console.log(`🔄 CSV batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(csvContacts.length / BATCH_SIZE)}`);
      
      for (const contactData of batch) {
        try {
          // Always create new records for CSV (allow duplicates as requested)
          const contact = new Contact(contactData);
          await contact.save();
          stats.csv.created++;
          stats.csv.processed++;
          
          if (stats.csv.processed % 1000 === 0) {
            console.log(`   Progress: ${stats.csv.processed}/${csvContacts.length} | Created: ${stats.csv.created}`);
          }
          
        } catch (error) {
          stats.csv.errors++;
          if (stats.csv.errors <= 5) {
            console.error(`❌ CSV error:`, error.message);
          }
        }
      }
    }
    
    console.log('✅ CSV import completed!');
    
  } catch (error) {
    console.error('💥 CSV import failed:', error);
  }
}

async function main() {
  const csvFilePath = process.argv[2];
  
  console.log('🎯 === FOCUSED DATA IMPORT ===');
  console.log('🔥 Importing Google Sheets + CSV directly to MongoDB');
  console.log('📅 Started at:', new Date().toISOString());
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Import Google Sheets and CSV
    await importGoogleSheets();
    
    if (csvFilePath) {
      await importCSV(csvFilePath);
    } else {
      console.log('\n📁 No CSV file specified. To include CSV:');
      console.log('   node scripts/import-sheets-csv.js ./prosperedatabase1.csv');
    }
    
    // Final statistics
    console.log('\n🎉 === IMPORT SUMMARY ===');
    console.log(`📊 Google Sheets: ${stats.googleSheets.processed} processed | ${stats.googleSheets.created} created | ${stats.googleSheets.updated} updated | ${stats.googleSheets.errors} errors`);
    console.log(`📊 CSV:           ${stats.csv.processed} processed | ${stats.csv.created} created | ${stats.csv.updated} updated | ${stats.csv.errors} errors`);
    
    const total = {
      processed: stats.googleSheets.processed + stats.csv.processed,
      created: stats.googleSheets.created + stats.csv.created,
      updated: stats.googleSheets.updated + stats.csv.updated,
      errors: stats.googleSheets.errors + stats.csv.errors
    };
    console.log(`📊 TOTAL:         ${total.processed} processed | ${total.created} created | ${total.updated} updated | ${total.errors} errors`);
    
    // Get final database counts
    const finalCounts = await Contact.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);
    
    console.log('\n🎯 === FINAL DATABASE COUNTS ===');
    finalCounts.forEach(source => {
      console.log(`📈 ${source._id}: ${source.count} contacts`);
    });
    
    const totalContacts = await Contact.countDocuments();
    console.log(`🚀 TOTAL CONTACTS: ${totalContacts}`);
    console.log('📅 Completed at:', new Date().toISOString());
    
  } catch (error) {
    console.error('💥 Import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the import
main();