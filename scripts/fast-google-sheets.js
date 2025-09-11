require('dotenv').config();
const mongoose = require('mongoose');
const googleSheetsService = require('../src/services/googleSheetsService');
const Contact = require('../src/models/Contact');

const SPREADSHEET_ID = '1htwt_ndpJrEfZCAu_WwIxHJWhz2fCLDRg7hD16K9QoI';
const MEGA_BATCH_SIZE = 5000; // Much larger batches for speed

async function fastGoogleSheetsImport() {
  try {
    console.log('⚡ === FAST GOOGLE SHEETS IMPORT ===');
    console.log('🚀 Using mega-batches for maximum speed');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all sheet data at once
    console.log('📄 Fetching ALL Google Sheets data...');
    const sheetsData = await googleSheetsService.getAllSheetData(SPREADSHEET_ID);
    
    let allContacts = [];
    for (const sheetData of sheetsData) {
      console.log(`📋 Processing sheet: ${sheetData.sheetName} (${sheetData.data.length} rows)`);
      const contacts = googleSheetsService.transformSheetData(sheetData.data);
      allContacts = allContacts.concat(contacts);
    }
    
    console.log(`📈 Total contacts to import: ${allContacts.length}`);
    
    // Process in mega-batches for speed
    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (let i = 0; i < allContacts.length; i += MEGA_BATCH_SIZE) {
      const batch = allContacts.slice(i, i + MEGA_BATCH_SIZE);
      console.log(`⚡ MEGA-BATCH ${Math.floor(i / MEGA_BATCH_SIZE) + 1}/${Math.ceil(allContacts.length / MEGA_BATCH_SIZE)} (${batch.length} contacts)...`);
      
      // Prepare bulk operations for maximum speed
      const bulkOps = [];
      
      for (const contactData of batch) {
        try {
          // Handle empty emails
          if (!contactData.email || contactData.email === '') {
            contactData.email = `placeholder_${contactData.sourceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@googlesheets.placeholder`;
          }
          
          // Use upsert for speed (update if exists, create if not)
          bulkOps.push({
            updateOne: {
              filter: { 
                source: 'google_sheets', 
                sourceId: contactData.sourceId 
              },
              update: { $set: contactData },
              upsert: true
            }
          });
          
          processed++;
          
        } catch (error) {
          errors++;
        }
      }
      
      // Execute bulk operation for maximum speed
      if (bulkOps.length > 0) {
        const result = await Contact.bulkWrite(bulkOps, { ordered: false });
        created += result.upsertedCount || 0;
        updated += result.modifiedCount || 0;
        
        console.log(`   ⚡ Batch completed: ${bulkOps.length} operations | Created: ${result.upsertedCount} | Updated: ${result.modifiedCount}`);
      }
    }
    
    console.log('\n🎉 FAST IMPORT COMPLETED!');
    console.log(`📈 Total processed: ${processed}`);
    console.log(`✨ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    
    // Get final stats
    const finalStats = await Contact.countDocuments({ source: 'google_sheets' });
    console.log(`🎯 Total Google Sheets contacts: ${finalStats}`);
    
  } catch (error) {
    console.error('💥 Fast import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the fast import
fastGoogleSheetsImport();