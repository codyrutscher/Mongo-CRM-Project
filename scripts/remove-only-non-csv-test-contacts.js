const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const fs = require('fs');
const csv = require('csv-parser');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function removeOnlyNonCsvTestContacts() {
  console.log('Removing only test contacts that are NOT in CSV...');
  
  try {
    // First, get all contact IDs from CSV (authoritative source)
    console.log('📄 Reading CSV to get authoritative contact list...');
    const csvContactIds = new Set();
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('all-contacts.csv')
        .pipe(csv())
        .on('data', (row) => {
          const hubspotId = row['Record ID'];
          if (hubspotId && hubspotId !== '' && hubspotId !== 'Record ID') {
            csvContactIds.add(hubspotId);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📊 CSV contains ${csvContactIds.size} authoritative contacts`);
    
    // Get current database count
    const currentTotal = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`📊 Database currently has ${currentTotal} contacts`);
    
    // Find test contacts in database
    const testContacts = await Contact.find({
      source: 'hubspot',
      $or: [
        { firstName: { $regex: /test/i } },
        { lastName: { $regex: /test/i } },
        { email: { $regex: /test/i } }
      ]
    }, 'sourceId firstName lastName email');
    
    console.log(`🧪 Found ${testContacts.length} test contacts in database`);
    
    // Filter test contacts - only remove those NOT in CSV
    const testContactsNotInCsv = testContacts.filter(contact => !csvContactIds.has(contact.sourceId));
    const testContactsInCsv = testContacts.filter(contact => csvContactIds.has(contact.sourceId));
    
    console.log(`🧪 Test contacts NOT in CSV (to be removed): ${testContactsNotInCsv.length}`);
    console.log(`🧪 Test contacts IN CSV (to be kept): ${testContactsInCsv.length}`);
    
    if (testContactsNotInCsv.length > 0) {
      console.log('\n🧪 Sample test contacts NOT in CSV (will be removed):');
      testContactsNotInCsv.slice(0, 10).forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
      });
    }
    
    if (testContactsInCsv.length > 0) {
      console.log('\n🧪 Sample test contacts IN CSV (will be kept):');
      testContactsInCsv.slice(0, 5).forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
      });
    }
    
    // Remove only test contacts that are NOT in CSV
    if (testContactsNotInCsv.length > 0) {
      console.log(`\n🗑️ Removing ${testContactsNotInCsv.length} test contacts that are not in CSV...`);
      
      const idsToRemove = testContactsNotInCsv.map(c => c.sourceId);
      
      const deleteResult = await Contact.deleteMany({
        source: 'hubspot',
        sourceId: { $in: idsToRemove }
      });
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} test contacts not in CSV`);
    }
    
    // Also remove any contacts that are in DB but not in CSV (regardless of test status)
    console.log('\n🔍 Checking for any other contacts in DB but not in CSV...');
    
    const allDbContacts = await Contact.find({ source: 'hubspot' }, 'sourceId').lean();
    const dbContactIds = new Set(allDbContacts.map(c => c.sourceId));
    
    const extraContacts = [];
    dbContactIds.forEach(id => {
      if (!csvContactIds.has(id)) {
        extraContacts.push(id);
      }
    });
    
    console.log(`📊 Other contacts in DB but not in CSV: ${extraContacts.length}`);
    
    if (extraContacts.length > 0 && extraContacts.length <= 10) { // Only if small number
      console.log('🗑️ Removing other contacts not in CSV...');
      
      const extraDeleteResult = await Contact.deleteMany({
        source: 'hubspot',
        sourceId: { $in: extraContacts }
      });
      
      console.log(`✅ Deleted ${extraDeleteResult.deletedCount} other extra contacts`);
    } else if (extraContacts.length > 10) {
      console.log(`⚠️ Too many extra contacts (${extraContacts.length}) - not removing automatically`);
    }
    
    // Final verification
    console.log('\n📊 Final verification...');
    const finalCount = await Contact.countDocuments({ source: 'hubspot' });
    
    console.log(`CSV contacts: ${csvContactIds.size}`);
    console.log(`Database contacts: ${finalCount}`);
    console.log(`Match: ${finalCount === csvContactIds.size ? '✅ PERFECT' : finalCount > csvContactIds.size ? '⚠️ MORE' : '❌ LESS'}`);
    
    if (finalCount === csvContactIds.size) {
      console.log('🎉 SUCCESS! Database now matches CSV exactly!');
    } else {
      console.log(`Difference: ${finalCount - csvContactIds.size}`);
    }
    
    // Check remaining test contacts
    const remainingTests = await Contact.countDocuments({
      source: 'hubspot',
      $or: [
        { firstName: { $regex: /test/i } },
        { lastName: { $regex: /test/i } },
        { email: { $regex: /test/i } }
      ]
    });
    
    console.log(`🧪 Remaining test contacts: ${remainingTests} (these are in CSV)`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the cleanup
removeOnlyNonCsvTestContacts()
  .then(() => {
    console.log('\nSelective cleanup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });