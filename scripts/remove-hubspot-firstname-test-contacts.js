const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function removeHubspotFirstnameTestContacts() {
  console.log('Removing hubspot-firstname-test contacts...');
  
  try {
    // Get current count
    const currentTotal = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`📊 Current total contacts: ${currentTotal}`);
    console.log(`📊 Target total: 136,157`);
    console.log(`📊 Need to remove: ${currentTotal - 136157} contacts`);
    
    // Find contacts with "hubspot" and "test" in their names
    console.log('\n🔍 Finding hubspot-firstname-test contacts...');
    
    const hubspotTestContacts = await Contact.find({
      source: 'hubspot',
      $or: [
        { 
          firstName: { $regex: /hubspot/i },
          $or: [
            { firstName: { $regex: /test/i } },
            { lastName: { $regex: /test/i } }
          ]
        },
        { 
          lastName: { $regex: /hubspot/i },
          $or: [
            { firstName: { $regex: /test/i } },
            { lastName: { $regex: /test/i } }
          ]
        },
        {
          firstName: { $regex: /^hubspot.*test$/i }
        },
        {
          lastName: { $regex: /^hubspot.*test$/i }
        },
        {
          firstName: { $regex: /^test.*hubspot$/i }
        },
        {
          lastName: { $regex: /^test.*hubspot$/i }
        }
      ]
    });
    
    console.log(`🧪 Found ${hubspotTestContacts.length} hubspot-test contacts:`);
    
    // Show the contacts we found
    hubspotTestContacts.forEach((contact, index) => {
      console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
    });
    
    // Also look for any contacts with "hubspot" in firstName and "test" anywhere
    const additionalTestContacts = await Contact.find({
      source: 'hubspot',
      firstName: { $regex: /hubspot/i },
      $or: [
        { firstName: { $regex: /test/i } },
        { lastName: { $regex: /test/i } },
        { email: { $regex: /test/i } }
      ],
      _id: { $nin: hubspotTestContacts.map(c => c._id) } // Exclude already found ones
    });
    
    console.log(`\n🔍 Found ${additionalTestContacts.length} additional hubspot contacts with test:`);
    additionalTestContacts.slice(0, 10).forEach((contact, index) => {
      console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
    });
    
    // Combine all test contacts
    const allTestContacts = [...hubspotTestContacts, ...additionalTestContacts];
    console.log(`\n📊 Total hubspot-test contacts found: ${allTestContacts.length}`);
    
    if (allTestContacts.length > 0) {
      // If we have exactly 100 or close to it, remove them
      const contactsToRemove = allTestContacts.slice(0, Math.min(allTestContacts.length, currentTotal - 136157));
      
      console.log(`\n🗑️ Removing ${contactsToRemove.length} hubspot-test contacts...`);
      
      const idsToRemove = contactsToRemove.map(c => c._id);
      
      const deleteResult = await Contact.deleteMany({
        _id: { $in: idsToRemove }
      });
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} hubspot-test contacts`);
      
      // Show which contacts were removed
      console.log('\n🗑️ Removed contacts:');
      contactsToRemove.forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
      });
    }
    
    // Final verification
    console.log('\n📊 Final verification...');
    const finalTotal = await Contact.countDocuments({ source: 'hubspot' });
    
    const finalDncCount = await Contact.countDocuments({ 
      source: 'hubspot',
      dncStatus: { $ne: 'callable' }
    });
    
    const finalCallableCount = await Contact.countDocuments({ 
      source: 'hubspot',
      dncStatus: 'callable'
    });
    
    console.log(`📊 Final results:`);
    console.log(`   Total contacts: ${finalTotal}`);
    console.log(`   Target total: 136,157`);
    console.log(`   Match: ${finalTotal === 136157 ? '✅ PERFECT' : finalTotal > 136157 ? '⚠️ MORE' : '❌ LESS'}`);
    console.log(`   Difference: ${finalTotal - 136157}`);
    console.log(`   DNC contacts: ${finalDncCount}`);
    console.log(`   Callable contacts: ${finalCallableCount}`);
    
    if (finalTotal === 136157) {
      console.log('\n🎉 SUCCESS! Total contacts now matches target exactly (136,157)!');
    }
    
    // Check for any remaining hubspot-test contacts
    const remainingTestContacts = await Contact.countDocuments({
      source: 'hubspot',
      $or: [
        { 
          firstName: { $regex: /hubspot/i },
          $or: [
            { firstName: { $regex: /test/i } },
            { lastName: { $regex: /test/i } }
          ]
        },
        { 
          lastName: { $regex: /hubspot/i },
          $or: [
            { firstName: { $regex: /test/i } },
            { lastName: { $regex: /test/i } }
          ]
        }
      ]
    });
    
    console.log(`🧪 Remaining hubspot-test contacts: ${remainingTestContacts}`);
    
  } catch (error) {
    console.error('Error removing hubspot-test contacts:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the removal
removeHubspotFirstnameTestContacts()
  .then(() => {
    console.log('\nHubspot-firstname-test contacts removal complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Removal failed:', error);
    process.exit(1);
  });