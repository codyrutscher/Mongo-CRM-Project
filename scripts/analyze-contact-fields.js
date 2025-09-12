require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

async function analyzeContactFields() {
  try {
    console.log('🔍 === ANALYZING CONTACT FIELDS ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get field statistics
    const fieldStats = await Contact.aggregate([
      {
        $group: {
          _id: null,
          totalContacts: { $sum: 1 },
          
          // DNC Status breakdown
          dncCallable: { $sum: { $cond: [{ $eq: ['$dncStatus', 'callable'] }, 1, 0] } },
          dncInternal: { $sum: { $cond: [{ $eq: ['$dncStatus', 'dnc_internal'] }, 1, 0] } },
          
          // Source breakdown  
          hubspotContacts: { $sum: { $cond: [{ $eq: ['$source', 'hubspot'] }, 1, 0] } },
          csvContacts: { $sum: { $cond: [{ $eq: ['$source', 'csv_upload'] }, 1, 0] } },
          
          // Address fields
          hasCity: { $sum: { $cond: [{ $and: [{ $ne: ['$address.city', ''] }, { $ne: ['$address.city', null] }] }, 1, 0] } },
          hasState: { $sum: { $cond: [{ $and: [{ $ne: ['$address.state', ''] }, { $ne: ['$address.state', null] }] }, 1, 0] } },
          
          // Contact info
          hasPhone: { $sum: { $cond: [{ $and: [{ $ne: ['$phone', ''] }, { $ne: ['$phone', null] }] }, 1, 0] } },
          hasCompany: { $sum: { $cond: [{ $and: [{ $ne: ['$company', ''] }, { $ne: ['$company', null] }] }, 1, 0] } },
          hasJobTitle: { $sum: { $cond: [{ $and: [{ $ne: ['$jobTitle', ''] }, { $ne: ['$jobTitle', null] }] }, 1, 0] } }
        }
      }
    ]);
    
    console.log('\n📊 === FIELD STATISTICS ===');
    const stats = fieldStats[0];
    console.log(`📈 Total Contacts: ${stats.totalContacts}`);
    console.log(`✅ Callable: ${stats.dncCallable}`);
    console.log(`🚫 DNC: ${stats.dncInternal}`);
    console.log(`🔗 HubSpot: ${stats.hubspotContacts}`);
    console.log(`📁 CSV: ${stats.csvContacts}`);
    console.log(`🏙️  Has City: ${stats.hasCity}`);
    console.log(`🗺️  Has State: ${stats.hasState}`);
    console.log(`📞 Has Phone: ${stats.hasPhone}`);
    console.log(`🏢 Has Company: ${stats.hasCompany}`);
    console.log(`💼 Has Job Title: ${stats.hasJobTitle}`);
    
    // Check custom fields
    console.log('\n🔧 === CUSTOM FIELDS ANALYSIS ===');
    
    const customFieldStats = await Contact.aggregate([
      { $match: { 'customFields': { $exists: true } } },
      { $project: { customFields: { $objectToArray: '$customFields' } } },
      { $unwind: '$customFields' },
      { 
        $group: { 
          _id: '$customFields.k', 
          count: { $sum: 1 },
          sampleValue: { $first: '$customFields.v' }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);
    
    customFieldStats.forEach(field => {
      console.log(`📋 ${field._id}: ${field.count} contacts (sample: "${field.sampleValue}")`);
    });
    
    // Check for specific business fields
    console.log('\n💼 === BUSINESS FIELDS CHECK ===');
    
    const businessFieldChecks = [
      'contactType',
      'sicCode',
      'naicsCode', 
      'businessCategory',
      'numberOfEmployees',
      'linkedinProfile',
      'websiteUrl',
      'leadSource'
    ];
    
    for (const field of businessFieldChecks) {
      const count = await Contact.countDocuments({
        [`customFields.${field}`]: { $exists: true, $ne: '' }
      });
      console.log(`🔍 customFields.${field}: ${count} contacts have data`);
    }
    
    // Sample DNC contact
    console.log('\n🚫 === SAMPLE DNC CONTACT ===');
    const dncContact = await Contact.findOne({ dncStatus: 'dnc_internal' });
    if (dncContact) {
      console.log('📋 DNC Contact Example:');
      console.log(`   Name: ${dncContact.firstName} ${dncContact.lastName}`);
      console.log(`   Email: ${dncContact.email}`);
      console.log(`   DNC Status: ${dncContact.dncStatus}`);
      console.log(`   Custom Fields:`, Object.keys(dncContact.customFields || {}));
    }
    
  } catch (error) {
    console.error('💥 Analysis failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run analysis
analyzeContactFields();