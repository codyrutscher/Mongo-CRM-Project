const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

require('dotenv').config();

/**
 * Clean up Railway CRM to match HubSpot contact count
 * - Remove duplicate contacts
 * - Remove test contacts
 * - Keep only one copy of each real contact
 */

async function cleanupRailwayToMatchHubSpot() {
  console.log('🧹 Cleaning up Railway CRM to match HubSpot');
  console.log('============================================');
  
  const railwayMongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;
  await mongoose.connect(railwayMongoUri);
  console.log('✅ Connected to Railway database');
  
  try {
    let totalRemoved = 0;
    
    // Step 1: Remove test contacts
    console.log('\n🧪 Step 1: Removing test contacts...');
    const testContactsQuery = {
      $or: [
        { email: { $regex: 'test', $options: 'i' } },
        { email: { $regex: 'example\\.com$', $options: 'i' } },
        { firstName: { $regex: '^test', $options: 'i' } },
        { lastName: { $regex: '^test', $options: 'i' } },
        { source: 'manual' }
      ]
    };
    
    const testContacts = await Contact.find(testContactsQuery);
    console.log(`Found ${testContacts.length} test contacts`);
    
    if (testContacts.length > 0) {
      console.log('Sample test contacts to be removed:');
      testContacts.slice(0, 5).forEach(contact => {
        console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email}) - Source: ${contact.source}`);
      });
      
      const testDeleteResult = await Contact.deleteMany(testContactsQuery);
      console.log(`✅ Removed ${testDeleteResult.deletedCount} test contacts`);
      totalRemoved += testDeleteResult.deletedCount;
    }
    
    // Step 2: Remove duplicate contacts (keep the most recent one)
    console.log('\n🔄 Step 2: Removing duplicate contacts...');
    
    const duplicates = await Contact.aggregate([
      {
        $match: {
          email: { $ne: '', $exists: true },
          source: 'hubspot'
        }
      },
      {
        $group: {
          _id: '$email',
          count: { $sum: 1 },
          contacts: { $push: { id: '$_id', createdAt: '$createdAt', sourceId: '$sourceId' } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);
    
    console.log(`Found ${duplicates.length} duplicate email groups`);
    
    let duplicatesRemoved = 0;
    for (const duplicate of duplicates) {
      // Sort by createdAt and keep the most recent one
      const sorted = duplicate.contacts.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      // Remove all except the first (most recent)
      const toRemove = sorted.slice(1);
      
      for (const contact of toRemove) {
        await Contact.deleteOne({ _id: contact.id });
        duplicatesRemoved++;
      }
      
      if (duplicatesRemoved % 10 === 0 && duplicatesRemoved > 0) {
        console.log(`  Processed ${duplicatesRemoved} duplicates...`);
      }
    }
    
    console.log(`✅ Removed ${duplicatesRemoved} duplicate contacts`);
    totalRemoved += duplicatesRemoved;
    
    // Step 3: Check final count
    console.log('\n📊 Final Count Check:');
    const finalCount = await Contact.countDocuments();
    const hubspotCount = await Contact.countDocuments({ source: 'hubspot' });
    
    console.log(`Total contacts in Railway: ${finalCount}`);
    console.log(`HubSpot contacts in Railway: ${hubspotCount}`);
    console.log(`HubSpot reported count: 137,250`);
    console.log(`Difference: ${hubspotCount - 137250}`);
    
    console.log('\n✅ Cleanup Summary:');
    console.log(`Total contacts removed: ${totalRemoved}`);
    console.log(`  - Test contacts: ${testContacts.length}`);
    console.log(`  - Duplicates: ${duplicatesRemoved}`);
    
    if (Math.abs(hubspotCount - 137250) <= 10) {
      console.log('\n🎉 SUCCESS! Contact counts are now synchronized!');
    } else {
      console.log('\n⚠️  There is still a difference. This could be due to:');
      console.log('   - Contacts deleted from HubSpot after our last sync');
      console.log('   - Contacts added to HubSpot after our last sync');
      console.log('   - Timing differences between systems');
      console.log('\n💡 Recommendation: Run a fresh sync to match exactly');
    }
    
    return {
      totalRemoved,
      testContactsRemoved: testContacts.length,
      duplicatesRemoved,
      finalCount,
      hubspotCount
    };
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from Railway database');
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupRailwayToMatchHubSpot()
    .then((results) => {
      console.log('\n🎯 Cleanup Complete!');
      console.log(`Removed ${results.totalRemoved} contacts`);
      console.log(`Final Railway count: ${results.finalCount}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { cleanupRailwayToMatchHubSpot };