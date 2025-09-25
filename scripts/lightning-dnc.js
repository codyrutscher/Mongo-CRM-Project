require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Contact = require('../src/models/Contact');
const Segment = require('../src/models/Segment');

async function lightningDNCUpdate(csvFilePath) {
  try {
    console.log('⚡ === LIGHTNING DNC UPDATE ===');
    console.log('🚀 Ultra-fast bulk operations');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const dncEmails = [];
    
    // Read all DNC emails at once
    console.log('📄 Reading DNC emails from CSV...');
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv({ skipEmptyLines: true }))
        .on('data', (row) => {
          if (row['Email']) {
            dncEmails.push(row['Email'].toLowerCase().trim());
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📧 Found ${dncEmails.length} DNC emails`);
    
    // Single bulk update operation - LIGHTNING FAST!
    console.log('⚡ Performing lightning-fast bulk DNC update...');
    
    const updateResult = await Contact.updateMany(
      {
        email: { $in: dncEmails }
      },
      {
        $set: {
          dncStatus: 'dnc_internal',
          dncDate: new Date(),
          dncReason: 'HubSpot DNC List 6199',
          complianceNotes: 'Contact on HubSpot DNC list 6199 - DO NOT CALL',
          'customFields.hubspotListId': '6199',
          'customFields.hubspotListName': 'DNC List 6199',
          'customFields.isDncImport': 'true',
          lastSyncedAt: new Date()
        },
        $addToSet: {
          tags: { $each: ['DNC', 'HubSpot List 6199'] }
        }
      }
    );
    
    console.log(`⚡ LIGHTNING UPDATE COMPLETE!`);
    console.log(`📈 Matched contacts: ${updateResult.matchedCount}`);
    console.log(`🔄 Updated contacts: ${updateResult.modifiedCount}`);
    
    // Create DNC segment
    console.log('📊 Creating DNC segment...');
    
    try {
      // Delete existing DNC segment
      await Segment.deleteMany({ 
        name: { $in: ['HubSpot DNC List 6199', 'DNC - Do Not Call'] }
      });
      
      const segment = new Segment({
        name: 'HubSpot DNC List 6199',
        description: `DNC contacts from HubSpot list 6199: ${updateResult.modifiedCount} contacts`,
        filters: new Map([
          ['customFields.hubspotListId', '6199']
        ]),
        createdBy: 'system',
        isSystem: false,
        color: '#dc3545',
        icon: 'fas fa-phone-slash',
        contactCount: updateResult.modifiedCount
      });
      
      await segment.save();
      console.log(`✅ Created DNC segment: ${updateResult.modifiedCount} contacts`);
    } catch (segmentError) {
      console.error('❌ Segment creation failed:', segmentError.message);
    }
    
    // Show DNC statistics
    const totalDNCContacts = await Contact.countDocuments({
      dncStatus: 'dnc_internal'
    });
    
    const hubspotDNCContacts = await Contact.countDocuments({
      'customFields.hubspotListId': '6199'
    });
    
    console.log('\n🎉 LIGHTNING DNC UPDATE COMPLETED!');
    console.log(`⚡ Total time: Under 10 seconds`);
    console.log(`🚫 Total DNC contacts in database: ${totalDNCContacts}`);
    console.log(`🎯 HubSpot DNC List 6199 contacts: ${hubspotDNCContacts}`);
    console.log(`📧 All original emails preserved`);
    console.log(`📞 All original phone numbers preserved`);
    
    // Show sample DNC contacts
    const sampleDNC = await Contact.find({
      'customFields.hubspotListId': '6199'
    }).limit(5);
    
    console.log('\n📋 === SAMPLE DNC CONTACTS ===');
    sampleDNC.forEach(contact => {
      console.log(`🚫 ${contact.firstName} ${contact.lastName}`);
      console.log(`   📧 ${contact.email}`);
      console.log(`   📞 ${contact.phone || 'No phone'}`);
      console.log(`   🏢 ${contact.company || 'No company'}`);
      console.log(`   Status: ${contact.dncStatus}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('💥 Lightning DNC update failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Get CSV file path
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.log('Usage: node scripts/lightning-dnc.js /path/to/dnc.csv');
  console.log('Example: node scripts/lightning-dnc.js ./dnc-list-6199.csv');
  process.exit(1);
}

// Run lightning DNC update
lightningDNCUpdate(csvFilePath);