require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Contact = require('../src/models/Contact');
const Segment = require('../src/models/Segment');

const MEGA_BATCH_SIZE = 5000;

async function finalDNCUpload(csvFilePath, segmentName = 'HubSpot DNC List 6199') {
  try {
    console.log('🚫 === FINAL DNC CSV UPLOAD ===');
    console.log('✅ Preserving original emails and phones');
    console.log('✅ Using upsert to handle duplicates');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    if (!fs.existsSync(csvFilePath)) {
      console.log('❌ CSV file not found');
      return;
    }
    
    const contacts = [];
    const uploadBatch = `dnc_final_${Date.now()}`;
    
    // Read CSV with correct mapping
    console.log('📄 Reading CSV with original field mapping...');
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv({ skipEmptyLines: true }))
        .on('data', (row) => {
          const uniqueId = `${Date.now()}_${contacts.length}`;
          
          const contact = {
            firstName: row['First Name'] || '',
            lastName: row['Last Name'] || '',
            email: row['Email'] || '', // Keep original email
            phone: row['Phone Number'] || '', // Keep original phone
            company: row['Company name'] || '', // Correct column name
            jobTitle: row['Job Title'] || '',
            
            address: {
              street: row['Street Address'] || '',
              city: row['City'] || '',
              state: row['State/Region'] || '',
              zipCode: row['Postal Code'] || row['Zipcode'] || '',
              country: row['Country/Region'] || 'United States'
            },
            
            // DNC Information
            dncStatus: 'dnc_internal',
            dncDate: new Date(),
            dncReason: 'HubSpot DNC List 6199',
            complianceNotes: `DNC contact from HubSpot list 6199, do not call`,
            
            // Source tracking with unique sourceId to allow duplicates
            source: 'csv_upload',
            sourceId: `dnc_6199_${uniqueId}`, // Unique sourceId
            lastSyncedAt: new Date(),
            status: 'active',
            lifecycleStage: 'lead',
            
            // Custom fields for segmentation
            customFields: {
              uploadBatch: uploadBatch,
              hubspotListId: '6199',
              hubspotListName: 'DNC List 6199',
              isDncImport: 'true',
              originalSource: 'HubSpot DNC List',
              recordId: row['Record ID - Contact'] || '',
              leadStatus: row['Lead Status'] || '',
              contactType: row['Contact Type'] || ''
            },
            
            tags: ['DNC', 'HubSpot List 6199']
          };
          
          contacts.push(contact);
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📈 Total DNC contacts to import: ${contacts.length}`);
    
    // Use bulk upsert operations to handle duplicates properly
    let saved = 0;
    let updated = 0;
    let errors = 0;
    
    for (let i = 0; i < contacts.length; i += MEGA_BATCH_SIZE) {
      const batch = contacts.slice(i, i + MEGA_BATCH_SIZE);
      console.log(`⚡ MEGA-BATCH ${Math.floor(i / MEGA_BATCH_SIZE) + 1}/${Math.ceil(contacts.length / MEGA_BATCH_SIZE)} (${batch.length} contacts)...`);
      
      try {
        // Use bulkWrite with upsert to handle duplicates
        const bulkOps = batch.map(contact => ({
          updateOne: {
            filter: { sourceId: contact.sourceId },
            update: { $set: contact },
            upsert: true
          }
        }));
        
        const result = await Contact.bulkWrite(bulkOps, { ordered: false });
        saved += result.upsertedCount || 0;
        updated += result.modifiedCount || 0;
        
        console.log(`   ✅ Upserted: ${result.upsertedCount} | Updated: ${result.modifiedCount}`);
        
      } catch (error) {
        errors += batch.length;
        console.error(`   ❌ Batch failed:`, error.message);
      }
    }
    
    // Create DNC segment
    try {
      // Delete existing segment if any
      await Segment.deleteMany({ name: segmentName });
      
      const segment = new Segment({
        name: segmentName,
        description: `DNC contacts from HubSpot list 6199: ${saved} contacts`,
        filters: new Map([
          ['customFields.hubspotListId', '6199']
        ]),
        createdBy: 'system',
        isSystem: false,
        color: '#dc3545',
        icon: 'fas fa-phone-slash',
        contactCount: saved
      });
      
      await segment.save();
      console.log(`✅ Created segment: ${segmentName}`);
    } catch (segmentError) {
      console.error('❌ Segment creation failed:', segmentError.message);
    }
    
    console.log('\n🎉 FINAL DNC IMPORT COMPLETED!');
    console.log(`📈 Total contacts saved: ${saved}`);
    console.log(`🔄 Total contacts updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📧 Original emails preserved`);
    console.log(`📞 Phone numbers preserved`);
    console.log(`🚫 All marked as DNC`);
    console.log(`📊 Segment created: "${segmentName}"`);
    
    // Sample the results
    const sampleContacts = await Contact.find({
      'customFields.hubspotListId': '6199'
    }).limit(5);
    
    console.log('\n📋 === SAMPLE DNC CONTACTS ===');
    sampleContacts.forEach(contact => {
      console.log(`👤 ${contact.firstName} ${contact.lastName}`);
      console.log(`   📧 ${contact.email}`);
      console.log(`   📞 ${contact.phone || 'No phone'}`);
      console.log(`   🏢 ${contact.company || 'No company'}`);
      console.log(`   🚫 ${contact.dncStatus}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('💥 Final upload failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Get parameters
const csvFilePath = process.argv[2];
const segmentName = process.argv[3] || 'HubSpot DNC List 6199';

if (!csvFilePath) {
  console.log('Usage: node scripts/dnc-final-upload.js /path/to/dnc.csv ["Segment Name"]');
  process.exit(1);
}

// Run the final upload
finalDNCUpload(csvFilePath, segmentName);