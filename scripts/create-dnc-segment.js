require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const Segment = require('../src/models/Segment');

async function createDNCSegment() {
  try {
    console.log('🚫 === CREATING DNC SEGMENT ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Count DNC contacts
    const dncCount = await Contact.countDocuments({ dncStatus: 'dnc_internal' });
    console.log(`📊 Found ${dncCount} DNC contacts`);
    
    // Create DNC segment
    const segment = new Segment({
      name: 'HubSpot DNC List 6199',
      description: `DNC contacts imported from HubSpot list 6199: ${dncCount} contacts`,
      filters: new Map([
        ['dncStatus', 'dnc_internal']
      ]),
      createdBy: 'system',
      isSystem: true,
      color: '#dc3545',
      icon: 'fas fa-phone-slash',
      contactCount: dncCount
    });
    
    await segment.save();
    console.log('✅ Created DNC segment successfully');
    
    // Also create segment for the recent CSV upload
    const csvDncCount = await Contact.countDocuments({ 
      'customFields.isDncImport': 'true' 
    });
    
    if (csvDncCount > 0) {
      const csvSegment = new Segment({
        name: 'CSV DNC Upload - Recent',
        description: `Recent DNC CSV upload: ${csvDncCount} contacts`,
        filters: new Map([
          ['customFields.isDncImport', 'true']
        ]),
        createdBy: 'csv_upload',
        isSystem: false,
        color: '#6f42c1',
        icon: 'fas fa-file-csv',
        contactCount: csvDncCount
      });
      
      await csvSegment.save();
      console.log('✅ Created CSV DNC segment successfully');
    }
    
    console.log('\n📊 === SEGMENTS CREATED ===');
    console.log(`🚫 "HubSpot DNC List 6199": ${dncCount} contacts`);
    console.log(`📁 "CSV DNC Upload - Recent": ${csvDncCount} contacts`);
    
  } catch (error) {
    console.error('💥 Segment creation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the segment creation
createDNCSegment();