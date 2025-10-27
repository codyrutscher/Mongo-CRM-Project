require('dotenv').config();
const mongoose = require('mongoose');

async function fixDNCSegment() {
  try {
    console.log('🔧 === FIXING DNC SEGMENT ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const segmentsCollection = db.collection('segments');
    
    // Update the DNC segment to have proper filters
    const updateResult = await segmentsCollection.updateOne(
      { name: 'HubSpot DNC List 6199' },
      {
        $set: {
          filters: {
            'customFields.hubspotListId': '6199'
          }
        }
      }
    );
    
    console.log(`✅ Updated DNC segment filters: ${updateResult.modifiedCount} segment updated`);
    
    // Check the segment
    const dncSegment = await segmentsCollection.findOne({ name: 'HubSpot DNC List 6199' });
    console.log('📊 DNC Segment structure:', JSON.stringify(dncSegment, null, 2));
    
  } catch (error) {
    console.error('💥 Fix failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the fix
fixDNCSegment();