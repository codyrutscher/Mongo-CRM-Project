require('dotenv').config();
const mongoose = require('mongoose');

async function cleanSegments() {
  try {
    console.log('🧹 === CLEANING SEGMENTS ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get segments collection directly
    const db = mongoose.connection.db;
    const segmentsCollection = db.collection('segments');
    
    // Delete all segments except the DNC one
    const deleteResult = await segmentsCollection.deleteMany({
      name: { $ne: 'HubSpot DNC List 6199' }
    });
    
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} unnecessary segments`);
    
    // Check remaining segments
    const remainingSegments = await segmentsCollection.find().toArray();
    
    console.log('\n📊 === REMAINING SEGMENTS ===');
    remainingSegments.forEach(segment => {
      console.log(`📋 ${segment.name}: ${segment.contactCount} contacts`);
    });
    
    if (remainingSegments.length === 0) {
      console.log('⚠️  No segments found. Creating DNC segment...');
      
      // Create the DNC segment if it doesn't exist
      const contactsCollection = db.collection('contacts');
      const dncCount = await contactsCollection.countDocuments({
        'customFields.hubspotListId': '6199'
      });
      
      const dncSegment = {
        name: 'HubSpot DNC List 6199',
        description: `DNC contacts from HubSpot list 6199: ${dncCount} contacts - DO NOT CALL`,
        filters: {
          'customFields.hubspotListId': '6199'
        },
        createdBy: 'system',
        isSystem: false,
        color: '#dc3545',
        icon: 'fas fa-phone-slash',
        contactCount: dncCount,
        lastCountUpdate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await segmentsCollection.insertOne(dncSegment);
      console.log(`✅ Created DNC segment: ${dncCount} contacts`);
    }
    
  } catch (error) {
    console.error('💥 Segment cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run cleanup
cleanSegments();