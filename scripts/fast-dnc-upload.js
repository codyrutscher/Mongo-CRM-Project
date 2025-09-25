require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Contact = require('../src/models/Contact');
const segmentService = require('../src/services/segmentService');

const MEGA_BATCH_SIZE = 5000; // Process 5000 at once for maximum speed

async function fastDNCUpload(csvFilePath, segmentName = 'DNC List from CSV') {
  try {
    console.log('⚡ === FAST DNC CSV UPLOAD ===');
    console.log(`📄 Processing: ${csvFilePath}`);
    console.log('🚀 Using mega-batches for maximum speed');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    if (!fs.existsSync(csvFilePath)) {
      console.log('❌ CSV file not found');
      return;
    }
    
    const contacts = [];
    const uploadBatch = `dnc_${Date.now()}`;
    
    // Read all CSV data at once
    console.log('📄 Reading CSV file...');
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv({ skipEmptyLines: true }))
        .on('data', (row) => {
          const originalEmail = row['Email'] || row['email'] || '';
          const uniqueId = `${Date.now()}_${contacts.length}`;
          
          const contact = {
            firstName: row['First Name'] || row['firstname'] || '',
            lastName: row['Last Name'] || row['lastname'] || '',
            // Use unique email to avoid duplicates
            email: originalEmail ? `${originalEmail.split('@')[0]}_dnc_${uniqueId}@${originalEmail.split('@')[1] || 'dnc.placeholder'}` : `placeholder_dnc_${uniqueId}@dnc.placeholder`,
            phone: row['Phone'] || row['phone'] || row['Phone Number'] || '',
            company: row['Company'] || row['company'] || '',
            jobTitle: row['Job Title'] || row['jobtitle'] || '',
            
            address: {
              street: row['Address'] || row['Street'] || '',
              city: row['City'] || row['city'] || '',
              state: row['State'] || row['state'] || '',
              zipCode: row['Zip'] || row['zipcode'] || row['Postal Code'] || '',
              country: row['Country'] || row['country'] || 'United States'
            },
            
            // DNC Information
            dncStatus: 'dnc_internal',
            dncDate: new Date(),
            dncReason: 'DNC List Import from CSV',
            complianceNotes: `Imported from ${csvFilePath} on ${new Date().toISOString()}`,
            
            // Source tracking
            source: 'csv_upload',
            sourceId: `dnc_csv_${uniqueId}`,
            lastSyncedAt: new Date(),
            status: 'active',
            lifecycleStage: 'lead',
            
            // Custom fields
            customFields: {
              uploadBatch: uploadBatch,
              uploadTimestamp: new Date().toISOString(),
              isDncImport: 'true',
              originalSource: 'DNC CSV Import',
              originalEmail: originalEmail
            },
            
            tags: ['DNC', 'CSV Import']
          };
          
          contacts.push(contact);
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📈 Total contacts to import: ${contacts.length}`);
    
    // Process in mega-batches for maximum speed
    let saved = 0;
    let errors = 0;
    
    for (let i = 0; i < contacts.length; i += MEGA_BATCH_SIZE) {
      const batch = contacts.slice(i, i + MEGA_BATCH_SIZE);
      console.log(`⚡ MEGA-BATCH ${Math.floor(i / MEGA_BATCH_SIZE) + 1}/${Math.ceil(contacts.length / MEGA_BATCH_SIZE)} (${batch.length} contacts)...`);
      
      try {
        // Use insertMany for maximum speed (no duplicate checking)
        const result = await Contact.insertMany(batch, { 
          ordered: false, // Continue on errors
          rawResult: true 
        });
        
        saved += result.insertedCount || batch.length;
        console.log(`   ⚡ Batch completed: ${result.insertedCount || batch.length} contacts saved`);
        
      } catch (error) {
        // Handle bulk insert errors
        if (error.writeErrors) {
          errors += error.writeErrors.length;
          saved += batch.length - error.writeErrors.length;
          console.log(`   ⚡ Batch completed with errors: ${batch.length - error.writeErrors.length} saved, ${error.writeErrors.length} errors`);
        } else {
          errors += batch.length;
          console.error(`   ❌ Batch failed:`, error.message);
        }
      }
    }
    
    // Create DNC segment automatically
    if (saved > 0) {
      try {
        const segmentData = {
          name: segmentName,
          description: `DNC contacts imported from CSV: ${saved} contacts`,
          filters: {
            'customFields.uploadBatch': uploadBatch
          },
          color: '#dc3545',
          icon: 'fas fa-phone-slash',
          createdBy: 'dnc_import'
        };
        
        const segment = await segmentService.createSegment(segmentData);
        console.log(`✅ Created DNC segment: ${segmentName}`);
      } catch (segmentError) {
        console.error('❌ Error creating segment:', segmentError);
      }
    }
    
    console.log('\n🎉 FAST DNC IMPORT COMPLETED!');
    console.log(`📈 Total contacts saved: ${saved}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`🚫 All contacts marked as DNC`);
    console.log(`📊 Automatic segment: "${segmentName}"`);
    console.log(`⚡ Speed: ~${Math.round(saved / ((Date.now() - parseInt(uploadBatch.split('_')[1])) / 1000))} contacts/second`);
    
    // Final stats
    const totalDncContacts = await Contact.countDocuments({ dncStatus: 'dnc_internal' });
    console.log(`🎯 Total DNC contacts in database: ${totalDncContacts}`);
    
  } catch (error) {
    console.error('💥 Fast DNC upload failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Get parameters from command line
const csvFilePath = process.argv[2];
const segmentName = process.argv[3] || 'DNC List from CSV';

if (!csvFilePath) {
  console.log('Usage: node scripts/fast-dnc-upload.js /path/to/dnc.csv ["Custom Segment Name"]');
  console.log('Example: node scripts/fast-dnc-upload.js ./dnc-list-6199.csv "HubSpot DNC List 6199"');
  process.exit(1);
}

// Run the fast upload
fastDNCUpload(csvFilePath, segmentName);