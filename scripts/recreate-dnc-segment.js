require('dotenv').config();
const mongoose = require('mongoose');
const Segment = require('../src/models/Segment');
const Contact = require('../src/models/Contact');

async function recreateDNCSegment() {
  try {
    console.log('🔧 === RECREATING DNC SEGMENT ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Delete the broken DNC segment
    await Segment.deleteMany({ name: 'HubSpot DNC List 6199' });
    console.log('🗑️  Deleted broken DNC segment');
    
    // Count DNC contacts
    const dncContacts = await Contact.find({
      'customFields.hubspotListId': '6199'
    }).select('_id');
    
    const dncContactIds = dncContacts.map(contact => contact._id.toString());
    
    console.log(`📊 Found ${dncContactIds.length} DNC contacts`);
    
    // Create new DNC segment with proper structure
    const segment = new Segment({
      name: 'HubSpot DNC List 6199',
      description: `DNC contacts from HubSpot list 6199: ${dncContactIds.length} contacts - DO NOT CALL`,
      filters: new Map([
        ['_id', { '$in': dncContactIds }]
      ]),
      createdBy: 'system',
      isSystem: false,
      color: '#dc3545',
      icon: 'fas fa-phone-slash',
      contactCount: dncContactIds.length
    });
    
    await segment.save();
    console.log(`✅ Created new DNC segment with ${dncContactIds.length} contacts`);
    
    // Test the segment
    const testSegment = await Segment.findById(segment._id);
    console.log('📋 Segment structure:', {
      name: testSegment.name,
      contactCount: testSegment.contactCount,
      filtersType: testSegment.filters.constructor.name,
      filtersContent: Object.fromEntries(testSegment.filters)
    });
    
  } catch (error) {
    console.error('💥 Recreation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the recreation
recreateDNCSegment();