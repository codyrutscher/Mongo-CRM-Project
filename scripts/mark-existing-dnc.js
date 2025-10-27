require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Contact = require('../src/models/Contact');
const Segment = require('../src/models/Segment');

async function markExistingContactsAsDNC(csvFilePath) {
  try {
    console.log('🚫 === MARK EXISTING CONTACTS AS DNC ===');
    console.log('🎯 Strategy: Find existing contacts and mark them as DNC');
    console.log('✅ No duplicates - just update DNC status');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    if (!fs.existsSync(csvFilePath)) {
      console.log('❌ CSV file not found');
      return;
    }
    
    const dncEmails = [];
    const dncPhones = [];
    const dncNames = [];
    
    // Read all DNC emails and info from CSV
    console.log('📄 Reading DNC list from CSV...');
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv({ skipEmptyLines: true }))
        .on('data', (row) => {
          const email = row['Email'];
          const phone = row['Phone Number'];
          const firstName = row['First Name'];
          const lastName = row['Last Name'];
          
          if (email) dncEmails.push(email.toLowerCase().trim());
          if (phone) dncPhones.push(phone.trim());
          if (firstName && lastName) {
            dncNames.push({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email || '',
              phone: phone || ''
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📧 Found ${dncEmails.length} DNC emails`);
    console.log(`📞 Found ${dncPhones.length} DNC phone numbers`);
    console.log(`👤 Found ${dncNames.length} DNC contacts`);
    
    // Find existing contacts that match DNC list
    console.log('🔍 Finding existing contacts to mark as DNC...');
    
    let markedAsDNC = 0;
    let newDNCContacts = 0;
    
    // Process in batches for email matches
    const emailBatchSize = 1000;
    for (let i = 0; i < dncEmails.length; i += emailBatchSize) {
      const emailBatch = dncEmails.slice(i, i + emailBatchSize);
      
      console.log(`📧 Processing email batch ${Math.floor(i / emailBatchSize) + 1}/${Math.ceil(dncEmails.length / emailBatchSize)}`);
      
      const existingContacts = await Contact.find({
        email: { $in: emailBatch }
      });
      
      console.log(`   Found ${existingContacts.length} existing contacts with matching emails`);
      
      // Mark all matching contacts as DNC
      for (const contact of existingContacts) {
        contact.dncStatus = 'dnc_internal';
        contact.dncDate = new Date();
        contact.dncReason = 'HubSpot DNC List 6199';
        contact.complianceNotes = 'Contact appears on HubSpot DNC list 6199 - DO NOT CALL';
        contact.customFields = contact.customFields || {};
        contact.customFields.hubspotListId = '6199';
        contact.customFields.hubspotListName = 'DNC List 6199';
        contact.customFields.isDncImport = 'true';
        contact.lastSyncedAt = new Date();
        
        if (!contact.tags.includes('DNC')) {
          contact.tags.push('DNC');
        }
        
        await contact.save();
        markedAsDNC++;
      }
    }
    
    // For contacts not in the database, create new ones
    console.log('➕ Creating new DNC contacts for emails not in database...');
    
    const existingEmails = await Contact.distinct('email');
    const newDNCData = dncNames.filter(dnc => 
      dnc.email && !existingEmails.includes(dnc.email.toLowerCase())
    );
    
    console.log(`📤 Creating ${newDNCData.length} new DNC contacts...`);
    
    if (newDNCData.length > 0) {
      const newContacts = newDNCData.map((dnc, index) => ({
        firstName: dnc.firstName,
        lastName: dnc.lastName,
        email: dnc.email,
        phone: dnc.phone,
        company: '',
        jobTitle: '',
        address: { country: 'United States' },
        dncStatus: 'dnc_internal',
        dncDate: new Date(),
        dncReason: 'HubSpot DNC List 6199',
        complianceNotes: 'New DNC contact from HubSpot list 6199',
        source: 'csv_upload',
        sourceId: `dnc_new_${Date.now()}_${index}`,
        lastSyncedAt: new Date(),
        status: 'active',
        lifecycleStage: 'lead',
        customFields: {
          hubspotListId: '6199',
          hubspotListName: 'DNC List 6199',
          isDncImport: 'true',
          originalSource: 'HubSpot DNC List'
        },
        tags: ['DNC', 'HubSpot List 6199']
      }));
      
      const insertResult = await Contact.insertMany(newContacts, { ordered: false });
      newDNCContacts = insertResult.length;
    }
    
    // Create DNC segment
    const totalDNCContacts = await Contact.countDocuments({
      'customFields.hubspotListId': '6199'
    });
    
    try {
      await Segment.deleteMany({ name: 'HubSpot DNC List 6199' });
      
      const segment = new Segment({
        name: 'HubSpot DNC List 6199',
        description: `DNC contacts from HubSpot list 6199: ${totalDNCContacts} contacts`,
        filters: new Map([
          ['customFields.hubspotListId', '6199']
        ]),
        createdBy: 'system',
        isSystem: false,
        color: '#dc3545',
        icon: 'fas fa-phone-slash',
        contactCount: totalDNCContacts
      });
      
      await segment.save();
      console.log(`✅ Created segment with ${totalDNCContacts} DNC contacts`);
    } catch (error) {
      console.error('❌ Segment creation failed');
    }
    
    console.log('\n🎉 DNC PROCESSING COMPLETED!');
    console.log(`🔄 Existing contacts marked as DNC: ${markedAsDNC}`);
    console.log(`➕ New DNC contacts created: ${newDNCContacts}`);
    console.log(`🎯 Total DNC contacts in segment: ${totalDNCContacts}`);
    
  } catch (error) {
    console.error('💥 DNC processing failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Get CSV file path
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.log('Usage: node scripts/mark-existing-dnc.js /path/to/dnc.csv');
  console.log('Example: node scripts/mark-existing-dnc.js ./dnc-list-6199.csv');
  process.exit(1);
}

// Run the DNC marking
markExistingContactsAsDNC(csvFilePath);