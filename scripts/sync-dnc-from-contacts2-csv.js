const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const fs = require('fs');
const csv = require('csv-parser');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function syncDncFromContacts2Csv() {
  console.log('Syncing DNC status from contacts2.csv to match HubSpot exactly...');
  
  try {
    // Step 1: Reset all contacts to callable first
    console.log('🔄 Step 1: Resetting all contacts to callable...');
    
    const resetResult = await Contact.updateMany(
      { source: 'hubspot' },
      {
        $set: {
          dncStatus: 'callable',
          dncDate: null,
          dncReason: null,
          complianceNotes: null
        },
        $pull: { tags: 'DNC' }
      }
    );
    
    console.log(`✅ Reset ${resetResult.modifiedCount} contacts to callable`);
    
    // Step 2: Read contacts2.csv and identify DNC contacts
    console.log('\n🔄 Step 2: Reading contacts2.csv to identify DNC contacts...');
    
    const dncContactIds = [];
    const callableContactIds = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('contacts2.csv')
        .pipe(csv())
        .on('data', (row) => {
          const hubspotId = row['Record ID'];
          const doNotCall = row['Do Not Call'];
          
          if (hubspotId && hubspotId !== '' && hubspotId !== 'Record ID') {
            // Check if "Do Not Call" is true/True/1/yes
            if (doNotCall === 'true' || doNotCall === 'True' || doNotCall === '1' || 
                doNotCall === 'TRUE' || doNotCall === 'yes' || doNotCall === 'Yes' || 
                doNotCall === 'YES') {
              dncContactIds.push(hubspotId);
            } else {
              callableContactIds.push(hubspotId);
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📊 Found ${dncContactIds.length} DNC contacts in CSV`);
    console.log(`📊 Found ${callableContactIds.length} callable contacts in CSV`);
    console.log(`📊 Target DNC count: 94,314`);
    console.log(`📊 Difference from target: ${dncContactIds.length - 94314}`);
    
    // Step 3: Update DNC contacts in database
    if (dncContactIds.length > 0) {
      console.log('\n🔄 Step 3: Updating DNC contacts in database...');
      
      // Process in batches for better performance
      const batchSize = 1000;
      let totalUpdated = 0;
      
      for (let i = 0; i < dncContactIds.length; i += batchSize) {
        const batch = dncContactIds.slice(i, i + batchSize);
        
        const updateResult = await Contact.updateMany(
          { 
            source: 'hubspot',
            sourceId: { $in: batch }
          },
          {
            $set: {
              dncStatus: 'dnc_internal',
              dncDate: new Date(),
              dncReason: 'HubSpot Do Not Call flag from contacts2.csv',
              complianceNotes: 'Contact marked as Do Not Call in HubSpot - DO NOT CALL'
            },
            $addToSet: { tags: 'DNC' }
          }
        );
        
        totalUpdated += updateResult.modifiedCount;
        console.log(`  ✅ Updated batch ${Math.floor(i/batchSize) + 1}: ${updateResult.modifiedCount} contacts (Total: ${totalUpdated})`);
      }
      
      console.log(`\n✅ Total DNC contacts updated: ${totalUpdated}`);
    }
    
    // Step 4: Final verification
    console.log('\n📊 Final DNC status verification...');
    
    const finalDncCount = await Contact.countDocuments({ 
      source: 'hubspot',
      dncStatus: { $ne: 'callable' }
    });
    
    const finalCallableCount = await Contact.countDocuments({ 
      source: 'hubspot',
      dncStatus: 'callable'
    });
    
    const totalContacts = finalDncCount + finalCallableCount;
    
    console.log(`📊 Final results:`);
    console.log(`   Total contacts: ${totalContacts}`);
    console.log(`   DNC contacts: ${finalDncCount}`);
    console.log(`   Callable contacts: ${finalCallableCount}`);
    console.log(`   Target DNC: 94,314`);
    console.log(`   DNC Match: ${finalDncCount === 94314 ? '✅ PERFECT' : Math.abs(finalDncCount - 94314) <= 10 ? '✅ CLOSE' : '❌ OFF'}`);
    console.log(`   Difference from target: ${finalDncCount - 94314}`);
    
    // Show percentage breakdown
    const dncPercentage = ((finalDncCount / totalContacts) * 100).toFixed(2);
    const callablePercentage = ((finalCallableCount / totalContacts) * 100).toFixed(2);
    
    console.log(`\n📊 Breakdown:`);
    console.log(`   DNC: ${finalDncCount} (${dncPercentage}%)`);
    console.log(`   Callable: ${finalCallableCount} (${callablePercentage}%)`);
    
    if (finalDncCount === 94314) {
      console.log('\n🎉 SUCCESS! DNC status now matches HubSpot exactly!');
    } else if (Math.abs(finalDncCount - 94314) <= 10) {
      console.log('\n✅ Very close! DNC status is within acceptable range.');
    } else {
      console.log('\n⚠️ DNC count still differs from target by more than 10.');
    }
    
  } catch (error) {
    console.error('Error during DNC sync:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the DNC sync
syncDncFromContacts2Csv()
  .then(() => {
    console.log('\nDNC status sync from contacts2.csv complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('DNC sync failed:', error);
    process.exit(1);
  });