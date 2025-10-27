const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const fs = require('fs');
const csv = require('csv-parser');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function syncDncWithDncCsv() {
  console.log('Syncing DNC status with DNC.csv file...');
  
  try {
    // Step 1: Read DNC.csv to get the authoritative DNC list
    console.log('📄 Reading DNC.csv file...');
    
    const dncContactIds = new Set();
    let totalDncCsvContacts = 0;
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('DNC.csv')
        .pipe(csv())
        .on('data', (row) => {
          const hubspotId = row['Record ID'];
          const doNotCall = row['Do Not Call'];
          
          if (hubspotId && hubspotId !== '' && hubspotId !== 'Record ID') {
            totalDncCsvContacts++;
            
            // Check if "Do Not Call" is Yes/yes/YES/true/True/1
            if (doNotCall === 'Yes' || doNotCall === 'YES' || doNotCall === 'yes' || 
                doNotCall === 'true' || doNotCall === 'True' || doNotCall === 'TRUE' || 
                doNotCall === '1') {
              dncContactIds.add(hubspotId);
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📊 DNC.csv contains ${totalDncCsvContacts} total contacts`);
    console.log(`📊 DNC.csv contains ${dncContactIds.size} DNC contacts`);
    console.log(`📊 DNC.csv contains ${totalDncCsvContacts - dncContactIds.size} callable contacts`);
    
    // Step 2: Reset all contacts to callable first
    console.log('\n🔄 Step 1: Resetting all contacts to callable...');
    
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
    
    // Step 3: Update DNC contacts based on DNC.csv
    if (dncContactIds.size > 0) {
      console.log(`\n🔄 Step 2: Updating ${dncContactIds.size} DNC contacts from DNC.csv...`);
      
      // Convert Set to Array for batch processing
      const dncContactIdsArray = Array.from(dncContactIds);
      
      // Process in batches for better performance
      const batchSize = 1000;
      let totalUpdated = 0;
      
      for (let i = 0; i < dncContactIdsArray.length; i += batchSize) {
        const batch = dncContactIdsArray.slice(i, i + batchSize);
        
        const updateResult = await Contact.updateMany(
          { 
            source: 'hubspot',
            sourceId: { $in: batch }
          },
          {
            $set: {
              dncStatus: 'dnc_internal',
              dncDate: new Date(),
              dncReason: 'Listed in DNC.csv - HubSpot Do Not Call list',
              complianceNotes: 'Contact is on HubSpot DNC list from DNC.csv - DO NOT CALL'
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
    console.log(`   Total contacts in database: ${totalContacts}`);
    console.log(`   DNC contacts in database: ${finalDncCount}`);
    console.log(`   Callable contacts in database: ${finalCallableCount}`);
    console.log(`   DNC contacts in DNC.csv: ${dncContactIds.size}`);
    console.log(`   Callable contacts in DNC.csv: ${totalDncCsvContacts - dncContactIds.size}`);
    
    // Check match
    const dncMatch = finalDncCount === dncContactIds.size;
    const callableMatch = finalCallableCount === (totalDncCsvContacts - dncContactIds.size);
    
    console.log(`\n📊 Match Analysis:`);
    console.log(`   DNC count match: ${dncMatch ? '✅ PERFECT' : '❌ NO'} (${finalDncCount} vs ${dncContactIds.size})`);
    console.log(`   Callable count match: ${callableMatch ? '✅ PERFECT' : '❌ NO'} (${finalCallableCount} vs ${totalDncCsvContacts - dncContactIds.size})`);
    
    if (dncMatch && callableMatch) {
      console.log('\n🎉 SUCCESS! DNC status now matches DNC.csv exactly!');
    } else {
      console.log('\n⚠️ Some discrepancies found:');
      if (!dncMatch) {
        console.log(`   DNC difference: ${finalDncCount - dncContactIds.size}`);
      }
      if (!callableMatch) {
        console.log(`   Callable difference: ${finalCallableCount - (totalDncCsvContacts - dncContactIds.size)}`);
      }
      
      // Check if we have contacts in database that aren't in DNC.csv
      const dbContactIds = await Contact.distinct('sourceId', { source: 'hubspot' });
      const dbContactIdsSet = new Set(dbContactIds);
      
      // Read all contact IDs from DNC.csv
      const allDncCsvIds = new Set();
      await new Promise((resolve, reject) => {
        fs.createReadStream('DNC.csv')
          .pipe(csv())
          .on('data', (row) => {
            const hubspotId = row['Record ID'];
            if (hubspotId && hubspotId !== '' && hubspotId !== 'Record ID') {
              allDncCsvIds.add(hubspotId);
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });
      
      const contactsInDbNotInCsv = [];
      dbContactIdsSet.forEach(id => {
        if (!allDncCsvIds.has(id)) {
          contactsInDbNotInCsv.push(id);
        }
      });
      
      console.log(`   Contacts in DB but not in DNC.csv: ${contactsInDbNotInCsv.length}`);
      
      if (contactsInDbNotInCsv.length > 0 && contactsInDbNotInCsv.length <= 20) {
        console.log('   Sample IDs not in DNC.csv:', contactsInDbNotInCsv.slice(0, 10).join(', '));
      }
    }
    
    // Show percentage breakdown
    const dncPercentage = ((finalDncCount / totalContacts) * 100).toFixed(2);
    const callablePercentage = ((finalCallableCount / totalContacts) * 100).toFixed(2);
    
    console.log(`\n📊 Final Breakdown:`);
    console.log(`   DNC: ${finalDncCount} (${dncPercentage}%)`);
    console.log(`   Callable: ${finalCallableCount} (${callablePercentage}%)`);
    
  } catch (error) {
    console.error('Error during DNC sync:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the DNC sync
syncDncWithDncCsv()
  .then(() => {
    console.log('\nDNC status sync with DNC.csv complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('DNC sync failed:', error);
    process.exit(1);
  });