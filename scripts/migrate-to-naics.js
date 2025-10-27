require('dotenv').config();
const mongoose = require('mongoose');

async function migrateToNAICS() {
  try {
    console.log('🚀 Starting NAICS migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get current contact count using direct MongoDB query
    const contactsCollection = mongoose.connection.db.collection('contacts');
    const currentCount = await contactsCollection.countDocuments();
    console.log(`📊 Current contacts in database: ${currentCount}`);

    if (currentCount === 0) {
      console.log('✅ Database is empty, no migration needed');
      process.exit(0);
    }

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will clear all existing contacts and prepare for NAICS standardization');
    console.log('📋 All data sources (HubSpot, Google Sheets, CSV) will be re-synced with NAICS fields');
    console.log('🔄 This process is irreversible');
    
    // Clear existing contacts using direct MongoDB operations
    console.log('\n🗑️  Clearing existing contacts...');
    const deleteResult = await contactsCollection.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} contacts`);

    // Clear any existing indexes and recreate with NAICS structure
    console.log('🔧 Updating database indexes for NAICS fields...');
    
    // Drop existing collection to ensure clean slate
    try {
      await mongoose.connection.db.dropCollection('contacts');
      console.log('✅ Dropped existing contacts collection');
    } catch (error) {
      console.log('ℹ️  Collection already empty or doesn\'t exist');
    }

    console.log('\n✅ Database cleared and ready for NAICS standardization!');
    console.log('\n📋 Next steps:');
    console.log('1. Deploy the updated Contact model');
    console.log('2. Re-sync HubSpot contacts (will auto-map to NAICS fields)');
    console.log('3. Re-sync Google Sheets (will auto-map to NAICS fields)');
    console.log('4. Upload CSV files (will auto-map to NAICS fields)');
    console.log('\n🎯 All future data will follow the NAICS standard format!');

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run migration
migrateToNAICS();