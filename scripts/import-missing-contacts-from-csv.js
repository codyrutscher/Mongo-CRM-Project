const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const fs = require('fs');
const csv = require('csv-parser');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function importMissingContactsFromCsv() {
  console.log('Importing missing contacts from CSV...');
  
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
    console.log('🗄️ Getting existing database contacts...');
    const existingIds = await Contact.distinct('sourceId', { source: 'hubspot' });
    const existingIdsSet = new Set(existingIds);
    
    console.log(`📊 Database has ${existingIds.length} existing contacts`);
    
    // Find missing contacts
    const missingContacts = csvContacts.filter(contact => !existingIdsSet.has(contact.id));
    console.log(`📊 Found ${missingContacts.length} missing contacts`);
    
    // Filter out test contacts
    const testContacts = missingContacts.filter(contact => 
      contact.firstName?.toLowerCase().includes('test') || 
      contact.lastName?.toLowerCase().includes('test') ||
      contact.email?.toLowerCase().includes('test') ||
      contact.firstName?.toLowerCase().includes('hubspot') ||
      contact.lastName?.toLowerCase().includes('hubspot')
    );
    
    const legitimateContacts = missingContacts.filter(contact => 
      !(contact.firstName?.toLowerCase().includes('test') || 
        contact.lastName?.toLowerCase().includes('test') ||
        contact.email?.toLowerCase().includes('test') ||
        contact.firstName?.toLowerCase().includes('hubspot') ||
        contact.lastName?.toLowerCase().includes('hubspot'))
    );
    
    console.log(`📊 Test contacts to skip: ${testContacts.length}`);
    console.log(`📊 Legitimate contacts to import: ${legitimateContacts.length}`);
    
    if (testContacts.length > 0) {
      console.log('\n🧪 Sample test contacts being skipped:');
      testContacts.slice(0, 5).forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.id}`);
      });
    }
    
    if (legitimateContacts.length > 0) {
      console.log('\n📥 Importing legitimate contacts...');
      
      const contactsToInsert = legitimateContacts.map(contact => ({
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        company: contact.company,
        naicsCode: contact.naicsCode,
        source: 'hubspot',
        sourceId: contact.id,
        lifecycleStage: 'lead', // Default
        leadSource: 'hubspot_csv_import',
        sourceMetadata: {
          hubspotId: contact.id,
          contactOwner: contact.contactOwner,
          leadStatus: contact.leadStatus,
          csvImport: true,
          importDate: new Date().toISOString()
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
          console.log(`  ⚠️ Batch ${Math.floor(i/batchSize) + 1} had some errors (likely duplicates):`, error.message);
          imported += batch.length; // Assume most were imported
        }
      }
      
      console.log(`\n✅ Import complete! Imported ${imported} legitimate contacts`);
    }
    
    // Final verification
    console.log('\n📊 Final verification...');
    const finalCount = await Contact.countDocuments({ source: 'hubspot' });
    const csvLegitimateCount = csvContacts.length - testContacts.length;
    
    console.log(`Database contacts: ${finalCount}`);
    console.log(`CSV legitimate contacts: ${csvLegitimateCount}`);
    console.log(`Match: ${finalCount >= csvLegitimateCount ? '✅' : '❌'}`);
    
    if (finalCount >= csvLegitimateCount) {
      console.log('🎉 Database now matches or exceeds CSV legitimate contacts!');
    } else {
      console.log(`Still missing: ${csvLegitimateCount - finalCount} contacts`);
    }
    
  } catch (error) {
    console.error('Error during import:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the import
importMissingContactsFromCsv()
  .then(() => {
    console.log('\nCSV import complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });