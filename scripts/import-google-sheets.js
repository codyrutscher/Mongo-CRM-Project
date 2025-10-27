require('dotenv').config();
const mongoose = require('mongoose');
const googleSheetsService = require('../src/services/googleSheetsService');
const Contact = require('../src/models/Contact');

const SPREADSHEET_ID = '1htwt_ndpJrEfZCAu_WwIxHJWhz2fCLDRg7hD16K9QoI';
const BATCH_SIZE = 1000;

async function importGoogleSheets() {
  try {
    console.log('🚀 Starting direct Google Sheets import...');
    console.log('📊 Spreadsheet ID:', SPREADSHEET_ID);
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all sheet data
    console.log('📄 Fetching all sheet data...');
    const sheetsData = await googleSheetsService.getAllSheetData(SPREADSHEET_ID);
    
    let allContacts = [];
    for (const sheetData of sheetsData) {
      console.log(`📋 Processing sheet: ${sheetData.sheetName} (${sheetData.data.length} rows)`);
      const contacts = googleSheetsService.transformSheetData(sheetData.data);
      allContacts = allContacts.concat(contacts);
    }
    
    console.log(`📈 Total contacts to process: ${allContacts.length}`);
    
    // Process in batches
    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (let i = 0; i < allContacts.length; i += BATCH_SIZE) {
      const batch = allContacts.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} contacts)...`);
      
      for (const contactData of batch) {
        try {
          // Handle empty emails to avoid duplicate key errors
          if (!contactData.email || contactData.email === '') {
            contactData.email = `placeholder_${contactData.sourceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@googlesheets.placeholder`;
          }
          
          // Check if contact exists
          const existingContact = await Contact.findOne({
            $or: [
              { source: 'google_sheets', sourceId: contactData.sourceId },
              { email: contactData.email }
            ]
          });
          
          if (existingContact) {
            // Update existing contact
            Object.assign(existingContact, contactData);
            existingContact.lastSyncedAt = new Date();
            await existingContact.save();
            updated++;
          } else {
            // Create new contact
            const contact = new Contact(contactData);
            await contact.save();
            created++;
          }
          
          processed++;
          
          if (processed % 100 === 0) {
            console.log(`📊 Progress: ${processed}/${allContacts.length} (${((processed / allContacts.length) * 100).toFixed(1)}%)`);
          }
          
        } catch (error) {
          errors++;
          if (errors <= 10) {
            console.error(`❌ Error processing contact:`, error.message);
          }
        }
      }
    }
    
    console.log('\n🎉 Import completed!');
    console.log(`📈 Total processed: ${processed}`);
    console.log(`✨ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    
    // Get final stats
    const finalStats = await Contact.countDocuments({ source: 'google_sheets' });
    console.log(`🎯 Total Google Sheets contacts in database: ${finalStats}`);
    
  } catch (error) {
    console.error('💥 Import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the import
importGoogleSheets();