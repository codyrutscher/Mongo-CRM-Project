const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const fs = require('fs');
const csv = require('csv-parser');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function finalCleanupToMatchCsv() {
  console.log('Final cleanup to match CSV exactly...');
  
  try {
    // First, get the exact count from CSV
    console.log('📄 Reading CSV to get exact count...');
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
    
    console.log(`📊 CSV contains exactly ${csvContactIds.size} contacts`);
    
    // Get current database count
    const currentTotal = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`📊 Database currently has ${currentTotal} contacts`);
    console.log(`📊 Difference: ${currentTotal - csvContactIds.size}`);
    
    // Find all test contacts that should be removed
    console.log('\n🔍 Finding test contacts to remove...');
    
    const testContacts = await Contact.find({
      source: 'hubspot',
      $or: [
        { firstName: { $regex: /test/i } },
        { lastName: { $regex: /test/i } },
        { email: { $regex: /test/i } },
        { firstName: { $regex: /hubspot/i } },
        { lastName: { $regex: /hubspot/i } },
        { email: { $regex: /hubspot/i } },
        { company: { $regex: /hubspot/i } },
        { firstName: { $regex: /^(demo|sample|example|fake|dummy)$/i } },
        { lastName: { $regex: /^(demo|sample|example|fake|dummy)$/i } },
        { email: { $regex: /(demo|sample|example|fake|dummy|noreply|no-reply)/i } }
      ]
    });
    
    console.log(`🧪 Found ${testContacts.length} test contacts to remove`);
    
    // Show samples
    if (testContacts.length > 0) {
      console.log('\n🧪 Sample test contacts to be removed:');
      testContacts.slice(0, 10).forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
      });
    }
    
    // Remove test contacts
    if (testContacts.length > 0) {
      console.log(`\n🗑️ Removing ${testContacts.length} test contacts...`);
      
      const deleteResult = await Contact.deleteMany({
        source: 'hubspot',
        $or: [
          { firstName: { $regex: /test/i } },
          { lastName: { $regex: /test/i } },
          { email: { $regex: /test/i } },
          { firstName: { $regex: /hubspot/i } },
          { lastName: { $regex: /hubspot/i } },
          { email: { $regex: /hubspot/i } },
          { company: { $regex: /hubspot/i } },
          { firstName: { $regex: /^(demo|sample|example|fake|dummy)$/i } },
          { lastName: { $regex: /^(demo|sample|example|fake|dummy)$/i } },
          { email: { $regex: /(demo|sample|example|fake|dummy|noreply|no-reply)/i } }
        ]
      });
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} test contacts`);
    }
    
    // Check if we need to remove any contacts that are in DB but not in CSV
    console.log('\n🔍 Checking for contacts in DB but not in CSV...');
    
    const dbContacts = await Contact.find({ source: 'hubspot' }, 'sourceId').lean();
    const dbContactIds = new Set(dbContacts.map(c => c.sourceId));
    
    const extraContacts = [];
    dbContactIds.forEach(id => {
      if (!csvContactIds.has(id)) {
        extraContacts.push(id);
      }
    });
    
    console.log(`📊 Contacts in DB but not in CSV: ${extraContacts.length}`);
    
    if (extraContacts.length > 0 && extraContacts.length <= 50) { // Only if reasonable number
      console.log('\n🗑️ Removing contacts that are not in CSV...');
      
      const extraDeleteResult = await Contact.deleteMany({
        source: 'hubspot',
        sourceId: { $in: extraContacts }
      });
      
      console.log(`✅ Deleted ${extraDeleteResult.deletedCount} extra contacts`);
    }
    
    // Final verification
    console.log('\n📊 Final verification...');
    const finalCount = await Contact.countDocuments({ source: 'hubspot' });
    
    console.log(`CSV contacts: ${csvContactIds.size}`);
    console.log(`Database contacts: ${finalCount}`);
    console.log(`Match: ${finalCount === csvContactIds.size ? '✅ PERFECT' : '❌ NO'}`);
    
    if (finalCount === csvContactIds.size) {
      console.log('🎉 SUCCESS! Database now matches CSV exactly!');
    } else {
      console.log(`Difference: ${finalCount - csvContactIds.size}`);
      
      if (finalCount < csvContactIds.size) {
        console.log('❌ Database has fewer contacts than CSV');
        
        // Find missing contacts
        const missingIds = [];
        csvContactIds.forEach(id => {
          if (!dbContactIds.has(id)) {
            missingIds.push(id);
          }
        });
        console.log(`Missing contact IDs: ${missingIds.slice(0, 10).join(', ')}...`);
      } else {
        console.log('❌ Database has more contacts than CSV');
      }
    }
    
    // Check for any remaining test contacts
    const remainingTests = await Contact.countDocuments({
      source: 'hubspot',
      $or: [
        { firstName: { $regex: /test/i } },
        { lastName: { $regex: /test/i } },
        { email: { $regex: /test/i } }
      ]
    });
    
    console.log(`🧪 Remaining test contacts: ${remainingTests}`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the cleanup
finalCleanupToMatchCsv()
  .then(() => {
    console.log('\nFinal cleanup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });