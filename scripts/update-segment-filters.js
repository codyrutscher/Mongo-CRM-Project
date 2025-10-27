require('dotenv').config();
const mongoose = require('mongoose');

async function updateSegmentFilters() {
  try {
    console.log('🔄 === UPDATING SEGMENT FILTERS ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const segmentsCollection = db.collection('segments');
    
    // Update DNC segment filter
    const dncUpdate = await segmentsCollection.updateOne(
      { 
        $or: [
          { name: 'DNC - Do Not Call' },
          { name: 'DNC - Do Not Call (Dynamic)' }
        ]
      },
      {
        $set: {
          filters: { dncStatus: 'dnc_internal' },
          description: 'Contacts with Do Not Call = Yes in HubSpot - Real-time via webhooks',
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Updated DNC segment: ${dncUpdate.modifiedCount} segment(s)`);
    
    // Update Callable segment filter
    const callableUpdate = await segmentsCollection.updateOne(
      { 
        $or: [
          { name: 'Callable Contacts' },
          { name: 'Callable Contacts (Dynamic)' }
        ]
      },
      {
        $set: {
          filters: {
            $or: [
              { dncStatus: 'callable' },
              { dncStatus: { $exists: false } },
              { dncStatus: null }
            ]
          },
          description: 'Contacts safe to call - Real-time via webhooks',
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Updated Callable segment: ${callableUpdate.modifiedCount} segment(s)`);
    
    // Show current segment counts with new filters
    const contactsCollection = db.collection('contacts');
    
    const dncCount = await contactsCollection.countDocuments({ dncStatus: 'dnc_internal' });
    const callableCount = await contactsCollection.countDocuments({
      $or: [
        { dncStatus: 'callable' },
        { dncStatus: { $exists: false } },
        { dncStatus: null }
      ]
    });
    
    console.log('\n📊 NEW SEGMENT COUNTS:');
    console.log(`🚫 DNC Contacts: ${dncCount}`);
    console.log(`✅ Callable Contacts: ${callableCount}`);
    
    // Update the segment counts in the database
    await segmentsCollection.updateOne(
      { $or: [{ name: 'DNC - Do Not Call' }, { name: 'DNC - Do Not Call (Dynamic)' }] },
      { $set: { contactCount: dncCount, lastCountUpdate: new Date() } }
    );
    
    await segmentsCollection.updateOne(
      { $or: [{ name: 'Callable Contacts' }, { name: 'Callable Contacts (Dynamic)' }] },
      { $set: { contactCount: callableCount, lastCountUpdate: new Date() } }
    );
    
    console.log('✅ Updated segment counts in database');
    
  } catch (error) {
    console.error('💥 Update failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run update
updateSegmentFilters();