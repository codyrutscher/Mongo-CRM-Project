require('dotenv').config();
const mongoose = require('mongoose');

async function createDNCSegmentDirect() {
  try {
    console.log('📊 === CREATING DNC SEGMENT DIRECTLY ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get the Segment collection directly
    const db = mongoose.connection.db;
    const segmentsCollection = db.collection('segments');
    
    // Count DNC contacts
    const contactsCollection = db.collection('contacts');
    const dncCount = await contactsCollection.countDocuments({
      'customFields.hubspotListId': '6199'
    });
    
    console.log(`📊 Found ${dncCount} DNC contacts`);
    
    // Create segment document directly (bypassing Mongoose Map issues)
    const segmentDoc = {
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
    
    // Insert directly
    await segmentsCollection.deleteMany({ name: 'HubSpot DNC List 6199' });
    await segmentsCollection.insertOne(segmentDoc);
    
    console.log(`✅ Created DNC segment: "HubSpot DNC List 6199"`);
    
    // Also create a general DNC segment
    const allDNCCount = await contactsCollection.countDocuments({
      dncStatus: 'dnc_internal'
    });
    
    const allDNCSegment = {
      name: 'DNC - Do Not Call',
      description: `All DNC contacts: ${allDNCCount} contacts - DO NOT CALL`,
      filters: {
        dncStatus: 'dnc_internal'
      },
      createdBy: 'system',
      isSystem: true,
      color: '#dc3545',
      icon: 'fas fa-phone-slash',
      contactCount: allDNCCount,
      lastCountUpdate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await segmentsCollection.deleteMany({ name: 'DNC - Do Not Call' });
    await segmentsCollection.insertOne(allDNCSegment);
    
    console.log(`✅ Created general DNC segment: ${allDNCCount} total DNC contacts`);
    
    // Also create callable contacts segment
    const callableCount = await contactsCollection.countDocuments({
      dncStatus: { $ne: 'dnc_internal' }
    });
    
    const callableSegment = {
      name: 'Callable Contacts',
      description: `Safe to call contacts: ${callableCount} contacts`,
      filters: {
        dncStatus: 'callable'
      },
      createdBy: 'system',
      isSystem: true,
      color: '#28a745',
      icon: 'fas fa-phone',
      contactCount: callableCount,
      lastCountUpdate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await segmentsCollection.deleteMany({ name: 'Callable Contacts' });
    await segmentsCollection.insertOne(callableSegment);
    
    console.log(`✅ Created callable segment: ${callableCount} safe to call`);
    
    console.log('\n🎉 ALL DNC SEGMENTS CREATED!');
    console.log('📊 Available segments:');
    console.log(`   🚫 "DNC - Do Not Call": ${allDNCCount} contacts`);
    console.log(`   🎯 "HubSpot DNC List 6199": ${dncCount} contacts`);
    console.log(`   ✅ "Callable Contacts": ${callableCount} contacts`);
    
  } catch (error) {
    console.error('💥 Direct segment creation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the direct segment creation
createDNCSegmentDirect();