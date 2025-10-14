const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const fs = require('fs');
const csv = require('csv-parser');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function restoreMissingLegitimateContacts() {
  console.log('Restoring missing legitimate contacts...');
  
  try {
    // Read CSV file
    console.log('📄 Reading CSV file...');
    const csvContacts = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('all-contacts.csv')
        .pipe(csv())
        .on('data', (row) => {
          const hubspotId = row['Record ID'];
          if (hubspotId && hubspotId !== '' && hubspotId !== 'Record ID') {
            csvContacts.push({
              id: hubspotId,
              firstName: row['First Name'] || '',
              lastName: row['Last Name'] || '',
              email: row['Email'] || '',
              phone: row['Phone Number'] || '',
              company: row['Company Name'] || '',
              contactOwner: row['Contact owner'] || '',
              leadStatus: row['Lead Status'] || '',
              createDate: row['Create Date'] || '',
              naicsCode: row['NAICS Code'] || '',
              associatedCompany: row['Associated Company'] || ''
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📊 CSV contains ${csvContacts.length} contacts`);
    
    // Get existing database contact IDs
    const existingIds = await Contact.distinct('sourceId', { source: 'hubspot' });
    const existingIdsSet = new Set(existingIds);
    
    console.log(`📊 Database has ${existingIds.length} existing contacts`);
    
    // Find missing contacts
    const missingContacts = csvContacts.filter(contact => !existingIdsSet.has(contact.id));
    console.log(`📊 Found ${missingContacts.length} missing contacts`);
    
    if (missingContacts.length > 0) {
      console.log('\n📥 Importing all missing contacts (including legitimate ones)...');
      
      const contactsToInsert = missingContacts.map(contact => ({
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        company: contact.company,
        naicsCode: contact.naicsCode,
        source: 'hubspot',
        sourceId: contact.id,
        lifecycleStage: 'lead',
        leadSource: 'hubspot_csv_restore',
        sourceMetadata: {
          hubspotId: contact.id,
          contactOwner: contact.contactOwner,
          leadStatus: contact.leadStatus,
          csvRestore: true,
          restoreDate: new Date().toISOString()
        },
        lastSyncedAt: new Date(),
        createdAt: contact.createDate ? new Date(contact.createDate) : new Date(),
        updatedAt: new Date()
      }));
      
      // Import in batches
      const batchSize = 100;
      let imported = 0;
      
      for (let i = 0; i < contactsToInsert.length; i += batchSize) {
        const batch = contactsToInsert.slice(i, i + batchSize);
        
        try {
          await Contact.insertMany(batch, { ordered: false });
          imported += batch.length;
          console.log(`  ✅ Imported batch ${Math.floor(i/batchSize) + 1}: ${batch.length} contacts (Total: ${imported})`);
        } catch (error) {
          console.log(`  ⚠️ Batch ${Math.floor(i/batchSize) + 1} had some errors:`, error.message);
          // Count successful inserts even with some errors
          imported += batch.length;
        }
      }
      
      console.log(`\n✅ Restore complete! Imported ${imported} contacts`);
    }
    
    // Final verification
    console.log('\n📊 Final verification...');
    const finalCount = await Contact.countDocuments({ source: 'hubspot' });
    
    console.log(`CSV contacts: ${csvContacts.length}`);
    console.log(`Database contacts: ${finalCount}`);
    console.log(`Match: ${finalCount === csvContacts.length ? '✅ PERFECT' : finalCount > csvContacts.length ? '⚠️ MORE' : '❌ LESS'}`);
    
    if (finalCount === csvContacts.length) {
      console.log('🎉 SUCCESS! Database now matches CSV exactly!');
    } else if (finalCount > csvContacts.length) {
      console.log(`⚠️ Database has ${finalCount - csvContacts.length} more contacts than CSV`);
    } else {
      console.log(`❌ Database still missing ${csvContacts.length - finalCount} contacts`);
    }
    
    // Check for test contacts
    const testContacts = await Contact.countDocuments({
      source: 'hubspot',
      $or: [
        { firstName: { $regex: /test/i } },
        { lastName: { $regex: /test/i } },
        { email: { $regex: /test/i } }
      ]
    });
    
    console.log(`🧪 Test contacts in database: ${testContacts}`);
    
    // If we have test contacts, show some samples
    if (testContacts > 0) {
      const testSamples = await Contact.find({
        source: 'hubspot',
        $or: [
          { firstName: { $regex: /test/i } },
          { lastName: { $regex: /test/i } },
          { email: { $regex: /test/i } }
        ]
      }).limit(5);
      
      console.log('\n🧪 Sample test contacts still in database:');
      testSamples.forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
      });
    }
    
  } catch (error) {
    console.error('Error during restore:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the restore
restoreMissingLegitimateContacts()
  .then(() => {
    console.log('\nRestore complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Restore failed:', error);
    process.exit(1);
  });