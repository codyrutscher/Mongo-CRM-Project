require('dotenv').config();
const mongoose = require('mongoose');

async function createDynamicDNCSegment() {
  try {
    console.log('🚫 === CREATING DYNAMIC DNC SEGMENT ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const segmentsCollection = db.collection('segments');
    
    // Delete old DNC segments
    await segmentsCollection.deleteMany({
      name: { $in: ['HubSpot DNC List 6199', 'DNC - Do Not Call', 'Callable Contacts'] }
    });
    
    // Create dynamic DNC segment based on HubSpot "Do Not Call" property
    const dncSegment = {
      name: 'DNC - Do Not Call (Dynamic)',
      description: 'Contacts with Do Not Call = Yes in HubSpot - Real-time via webhooks',
      filters: {
        'customFields.hubspotDoNotCall': 'true'
      },
      createdBy: 'system',
      isSystem: true,
      color: '#dc3545',
      icon: 'fas fa-phone-slash',
      contactCount: 0,
      lastCountUpdate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await segmentsCollection.insertOne(dncSegment);
    console.log('✅ Created dynamic DNC segment');
    
    // Create callable segment (opposite of DNC)
    const callableSegment = {
      name: 'Callable Contacts (Dynamic)',
      description: 'Contacts safe to call - Real-time via webhooks',
      filters: {
        $or: [
          { 'customFields.hubspotDoNotCall': 'false' },
          { 'customFields.hubspotDoNotCall': '' },
          { 'customFields.hubspotDoNotCall': { $exists: false } }
        ]
      },
      createdBy: 'system',
      isSystem: true,
      color: '#28a745',
      icon: 'fas fa-phone',
      contactCount: 0,
      lastCountUpdate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await segmentsCollection.insertOne(callableSegment);
    console.log('✅ Created dynamic callable segment');
    
    console.log('\n🎉 DYNAMIC SEGMENTS CREATED!');
    console.log('📊 These segments will update automatically via webhooks');
    console.log('🚫 DNC segment: Filters by Do Not Call = Yes');
    console.log('✅ Callable segment: Filters by Do Not Call = No/Empty');
    
  } catch (error) {
    console.error('💥 Creation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run creation
createDynamicDNCSegment();