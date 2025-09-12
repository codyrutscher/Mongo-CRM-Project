require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Contact = require('../src/models/Contact');
const segmentService = require('../src/services/segmentService');

async function uploadDNCFromCSV(csvFilePath, segmentName = 'DNC List from CSV') {
  try {
    console.log('🚫 === DNC CSV UPLOAD ===');
    console.log(`📄 Processing: ${csvFilePath}`);
    console.log('✅ Allowing duplicates as requested');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    if (!fs.existsSync(csvFilePath)) {
      console.log('❌ CSV file not found');
      return;
    }
    
    const contacts = [];
    const uploadBatch = `dnc_${Date.now()}`;
    
    // Read CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv({ skipEmptyLines: true }))
        .on('data', (row) => {
          const contact = {
            firstName: row['First Name'] || row['firstname'] || '',
            lastName: row['Last Name'] || row['lastname'] || '',
            email: row['Email'] || row['email'] || `placeholder_${Date.now()}_${contacts.length}@dnc.placeholder`,
            phone: row['Phone'] || row['phone'] || row['Phone Number'] || '',
            company: row['Company'] || row['company'] || '',
            jobTitle: row['Job Title'] || row['jobtitle'] || '',
            
            // Address
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
            sourceId: `dnc_csv_${Date.now()}_${contacts.length}`,
            lastSyncedAt: new Date(),
            status: 'active',
            lifecycleStage: 'lead',
            
            // Custom fields for segmentation
            customFields: {
              uploadBatch: uploadBatch,
              uploadTimestamp: new Date().toISOString(),
              isDncImport: 'true',
              originalSource: 'DNC CSV Import'
            },
            
            tags: ['DNC', 'CSV Import']
          };
          
          contacts.push(contact);
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📈 Total contacts to import: ${contacts.length}`);
    
    // Save all contacts (allowing duplicates)
    let saved = 0;
    let errors = 0;
    
    for (const contactData of contacts) {
      try {
        const contact = new Contact(contactData);
        await contact.save();
        saved++;
        
        if (saved % 100 === 0) {
          console.log(`📊 Progress: ${saved}/${contacts.length} saved`);
        }
      } catch (error) {
        errors++;
        if (errors <= 10) {
          console.error(`❌ Error saving contact:`, error.message);
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
    
    console.log('\n🎉 DNC CSV IMPORT COMPLETED!');
    console.log(`📈 Total contacts saved: ${saved}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`🚫 All contacts marked as DNC`);
    console.log(`📊 Automatic segment created: "${segmentName}"`);
    
    // Final DNC stats
    const dncCount = await Contact.countDocuments({ 
      'customFields.uploadBatch': uploadBatch 
    });
    console.log(`🎯 DNC contacts in database: ${dncCount}`);
    
  } catch (error) {
    console.error('💥 DNC CSV upload failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Get CSV file path from command line
const csvFilePath = process.argv[2];
const segmentName = process.argv[3] || 'DNC List from CSV';

if (!csvFilePath) {
  console.log('Usage: node scripts/upload-dnc-csv.js /path/to/dnc.csv ["Custom Segment Name"]');
  console.log('Example: node scripts/upload-dnc-csv.js ./dnc-contacts.csv "HubSpot DNC List 6199"');
  process.exit(1);
}

// Run the upload
uploadDNCFromCSV(csvFilePath, segmentName);