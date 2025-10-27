require('dotenv').config();
const mongoose = require('mongoose');

async function clearDatabase() {
  try {
    console.log('🚀 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('📋 Available collections:', collections.map(c => c.name));

    // Clear contacts collection
    const contactsCollection = db.collection('contacts');
    const contactCount = await contactsCollection.countDocuments();
    
    console.log(`📊 Current contacts: ${contactCount}`);
    
    if (contactCount > 0) {
      console.log('🗑️  Clearing contacts collection...');
      const result = await contactsCollection.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} contacts`);
    }

    // Clear segments collection (they reference contacts)
    const segmentsCollection = db.collection('segments');
    const segmentCount = await segmentsCollection.countDocuments();
    
    if (segmentCount > 0) {
      console.log('🗑️  Clearing segments collection...');
      const result = await segmentsCollection.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} segments`);
    }

    console.log('\n✅ Database cleared successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Deploy the updated NAICS Contact model');
    console.log('2. Re-sync HubSpot contacts (will use NAICS fields)');
    console.log('3. Re-sync Google Sheets (will use NAICS fields)');
    console.log('4. Upload CSV files (will auto-map to NAICS fields)');
    console.log('\n🎯 All future data will follow the NAICS standard format!');

  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

clearDatabase();