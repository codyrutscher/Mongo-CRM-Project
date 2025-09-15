const mongoose = require('mongoose');
require('dotenv').config();
const Contact = require('./src/models/Contact');

async function cleanupPlaceholders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🧹 Cleaning up placeholder contacts...');
    
    // Remove CSV placeholders
    const csvResult = await Contact.deleteMany({
      source: 'csv_upload',
      email: { $regex: /placeholder|csv_.*@placeholder/ }
    });
    console.log(`🗑️  Removed ${csvResult.deletedCount} CSV placeholder contacts`);
    
    // Remove Google Sheets placeholders
    const sheetsResult = await Contact.deleteMany({
      source: 'google_sheets',
      email: { $regex: /placeholder.*@googlesheets\.placeholder/ }
    });
    console.log(`🗑️  Removed ${sheetsResult.deletedCount} Google Sheets placeholder contacts`);
    
    // Check final counts
    const counts = {
      hubspot: await Contact.countDocuments({ source: 'hubspot' }),
      csv: await Contact.countDocuments({ source: 'csv_upload' }),
      sheets: await Contact.countDocuments({ source: 'google_sheets' })
    };
    
    console.log('\n📊 Clean counts after placeholder removal:');
    console.log(`HubSpot: ${counts.hubspot}`);
    console.log(`CSV: ${counts.csv}`);
    console.log(`Google Sheets: ${counts.sheets}`);
    console.log(`Total: ${counts.hubspot + counts.csv + counts.sheets}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

cleanupPlaceholders();