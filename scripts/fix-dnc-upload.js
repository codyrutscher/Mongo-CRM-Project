require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Contact = require('../src/models/Contact');
const Segment = require('../src/models/Segment');

const MEGA_BATCH_SIZE = 5000;

async function fixDNCUpload(csvFilePath, segmentName = 'HubSpot DNC List 6199') {
  try {
    console.log('🔧 === FIXING DNC CSV UPLOAD ===');
    console.log('✅ Using ORIGINAL emails and phone numbers');
    console.log('✅ Allowing duplicates by using unique sourceIds');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // First, delete the incorrectly imported DNC contacts
    console.log('🗑️  Removing incorrectly imported DNC contacts...');
    const deleteResult = await Contact.deleteMany({
      'customFields.isDncImport': 'true'
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} incorrect DNC contacts`);
    
    if (!fs.existsSync(csvFilePath)) {
      console.log('❌ CSV file not found');
      return;
    }
    
    const contacts = [];
    const uploadBatch = `dnc_fixed_${Date.now()}`;
    
    // Read CSV with correct mapping
    console.log('📄 Reading CSV with correct field mapping...');
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
            company: row['Company name'] || '', // From your CSV headers
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
            dncReason: 'HubSpot DNC List 6199 Import',
            complianceNotes: `DNC contact from HubSpot list 6199, imported ${new Date().toISOString()}`,
            
            // Source tracking with unique sourceId to allow duplicates
            source: 'csv_upload',
            sourceId: `dnc_hubspot_6199_${uniqueId}`, // Unique to allow duplicates
            lastSyncedAt: new Date(),
            status: 'active',
            lifecycleStage: 'lead',
            
            // Custom fields for tracking and segmentation
            customFields: {
              uploadBatch: uploadBatch,
              uploadTimestamp: new Date().toISOString(),
              isDncImport: 'true',
              hubspotListId: '6199',
              hubspotListName: 'DNC List 6199',
              originalSource: 'HubSpot DNC List 6199',
              recordId: row['Record ID - Contact'] || ''
            },
            
            tags: ['DNC', 'HubSpot List 6199', 'Do Not Call']
          };
          
          contacts.push(contact);
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📈 Total DNC contacts to import: ${contacts.length}`);
    
    // Fast bulk import
    let saved = 0;
    let errors = 0;
    
    for (let i = 0; i < contacts.length; i += MEGA_BATCH_SIZE) {
      const batch = contacts.slice(i, i + MEGA_BATCH_SIZE);
      console.log(`⚡ MEGA-BATCH ${Math.floor(i / MEGA_BATCH_SIZE) + 1}/${Math.ceil(contacts.length / MEGA_BATCH_SIZE)} (${batch.length} contacts)...`);
      
      try {
        const result = await Contact.insertMany(batch, { 
          ordered: false,
          rawResult: true 
        });
        
        saved += result.insertedCount || batch.length;
        console.log(`   ✅ Saved: ${result.insertedCount || batch.length} DNC contacts`);
        
      } catch (error) {
        if (error.writeErrors) {
          errors += error.writeErrors.length;
          saved += batch.length - error.writeErrors.length;
          console.log(`   ⚠️  Saved: ${batch.length - error.writeErrors.length}, Errors: ${error.writeErrors.length}`);
        } else {
          errors += batch.length;
          console.error(`   ❌ Batch failed:`, error.message);
        }
      }
    }
    
    // Create DNC segment manually (avoiding Map issues)
    if (saved > 0) {
      try {
        // Delete existing DNC segment if any
        await Segment.deleteMany({ name: segmentName });
        
        const segment = new Segment({
          name: segmentName,
          description: `DNC contacts from HubSpot list 6199: ${saved} contacts`,
          filters: new Map([
            ['customFields.hubspotListId', '6199']
          ]),
          createdBy: 'dnc_import',
          isSystem: false,
          color: '#dc3545',
          icon: 'fas fa-phone-slash',
          contactCount: saved
        });
        
        await segment.save();
        console.log(`✅ Created DNC segment: ${segmentName}`);
      } catch (segmentError) {
        console.error('❌ Segment creation failed, but contacts are imported');
        console.log('💡 You can manually create a segment filtering by: customFields.hubspotListId = "6199"');
      }
    }
    
    console.log('\n🎉 FIXED DNC IMPORT COMPLETED!');
    console.log(`📈 Total DNC contacts saved: ${saved}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📧 Original emails preserved`);
    console.log(`📞 Phone numbers preserved`);
    console.log(`🚫 All marked as DNC with compliance tracking`);
    
    // Show sample contacts
    const sampleContacts = await Contact.find({
      'customFields.hubspotListId': '6199'
    }).limit(3);
    
    console.log('\n📋 === SAMPLE DNC CONTACTS ===');
    sampleContacts.forEach(contact => {
      console.log(`📞 ${contact.firstName} ${contact.lastName}`);
      console.log(`   📧 Email: ${contact.email}`);
      console.log(`   📱 Phone: ${contact.phone || 'No phone'}`);
      console.log(`   🚫 DNC Status: ${contact.dncStatus}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('💥 Fix failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Get parameters
const csvFilePath = process.argv[2];
const segmentName = process.argv[3] || 'HubSpot DNC List 6199';

if (!csvFilePath) {
  console.log('Usage: node scripts/fix-dnc-upload.js /path/to/dnc.csv ["Segment Name"]');
  console.log('Example: node scripts/fix-dnc-upload.js ./dnc-list-6199.csv');
  process.exit(1);
}

// Run the fix
fixDNCUpload(csvFilePath, segmentName);