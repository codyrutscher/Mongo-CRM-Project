const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function restoreAndRemoveSpecificTests() {
  console.log('Restoring contacts and removing only specific test contacts...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  try {
    const currentCount = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`📊 Current contacts in DB: ${currentCount}`);
    console.log(`📊 Expected: 135,958 (minus ~100 specific test contacts)`);
    
    if (currentCount < 135800) { // We're missing too many contacts
      console.log('🔄 Need to restore missing contacts...');
      
      // Get all current sourceIds to avoid duplicates
      const existingSourceIds = await Contact.distinct('sourceId', { source: 'hubspot' });
      console.log(`📊 Found ${existingSourceIds.length} existing sourceIds`);
      
      // Re-import missing contacts
      let after = undefined;
      let totalRestored = 0;
      let batchNumber = 1;
      
      while (true) {
        try {
          console.log(`\nChecking batch ${batchNumber}...`);
          
          const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
            headers: {
              'Authorization': `Bearer ${hubspotToken}`,
              'Content-Type': 'application/json'
            },
            params: {
              limit: 100,
              properties: 'email,firstname,lastname,phone,company,jobtitle,city,state,country,lifecyclestage,createdate,lastmodifieddate',
              ...(after && { after })
            },
            timeout: 30000
          });

          const contacts = response.data.results;
          if (!contacts || contacts.length === 0) {
            console.log('No more contacts available');
            break;
          }

          // Filter out contacts we already have
          const newContacts = contacts.filter(contact => !existingSourceIds.includes(contact.id));
          
          if (newContacts.length > 0) {
            console.log(`  Found ${newContacts.length} missing contacts in batch ${batchNumber}`);
            
            const contactsToInsert = newContacts.map(contact => ({
              email: contact.properties.email || '',
              firstName: contact.properties.firstname || '',
              lastName: contact.properties.lastname || '',
              phone: contact.properties.phone || '',
              company: contact.properties.company || '',
              jobTitle: contact.properties.jobtitle || '',
              companyCity: contact.properties.city || '',
              companyState: contact.properties.state || '',
              source: 'hubspot',
              sourceId: contact.id,
              lifecycleStage: contact.properties.lifecyclestage || 'lead',
              sourceMetadata: {
                hubspotId: contact.id,
                originalData: contact.properties,
                restoredContact: true
              },
              lastSyncedAt: new Date(),
              createdAt: contact.properties.createdate ? new Date(contact.properties.createdate) : new Date(),
              updatedAt: contact.properties.lastmodifieddate ? new Date(contact.properties.lastmodifieddate) : new Date()
            }));

            await Contact.insertMany(contactsToInsert, { ordered: false });
            totalRestored += contactsToInsert.length;
            console.log(`  ✅ Restored ${contactsToInsert.length} contacts. Total restored: ${totalRestored}`);
          } else {
            console.log(`  No missing contacts in batch ${batchNumber}`);
          }

          // Move to next batch
          if (response.data.paging && response.data.paging.next) {
            after = response.data.paging.next.after;
          } else {
            console.log('No more pages available');
            break;
          }

        } catch (error) {
          if (error.response && error.response.status === 500) {
            console.log(`❌ 500 error in batch ${batchNumber}, skipping...`);
            after = after ? (parseInt(after) + 100).toString() : '100';
          } else {
            console.log(`❌ Error in batch ${batchNumber}:`, error.message);
            break;
          }
        }

        batchNumber++;
        
        // Safety break
        if (batchNumber > 1500) {
          console.log('Safety break - reached 1500 batches');
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`\n✅ Restoration complete! Restored ${totalRestored} contacts`);
    }
    
    // Now find and remove ONLY the specific "hubspot-firstname-test" contacts
    console.log('\n🔍 Looking for specific "hubspot-firstname-test" contacts...');
    
    const specificTestContacts = await Contact.find({
      source: 'hubspot',
      firstName: { $regex: /^hubspot.*test$/i }
    });
    
    console.log(`Found ${specificTestContacts.length} contacts with firstName matching "hubspot*test":`);
    specificTestContacts.forEach(contact => {
      console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
    });
    
    // Also check for other variations
    const otherTestVariations = await Contact.find({
      source: 'hubspot',
      $or: [
        { firstName: { $regex: /^hubspot.*test$/i } },
        { firstName: { $regex: /^test.*hubspot$/i } },
        { lastName: { $regex: /^hubspot.*test$/i } },
        { lastName: { $regex: /^test.*hubspot$/i } }
      ]
    });
    
    console.log(`\nFound ${otherTestVariations.length} total contacts with hubspot-test variations:`);
    otherTestVariations.forEach(contact => {
      console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
    });
    
    if (otherTestVariations.length > 0) {
      console.log(`\n🗑️ Removing ${otherTestVariations.length} specific hubspot-test contacts...`);
      
      const deleteResult = await Contact.deleteMany({
        source: 'hubspot',
        $or: [
          { firstName: { $regex: /^hubspot.*test$/i } },
          { firstName: { $regex: /^test.*hubspot$/i } },
          { lastName: { $regex: /^hubspot.*test$/i } },
          { lastName: { $regex: /^test.*hubspot$/i } }
        ]
      });
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} specific test contacts`);
    }
    
    const finalCount = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`\n📊 Final count: ${finalCount}`);
    console.log(`📊 Expected: ~135,858 (135,958 - ~100 test contacts)`);
    
  } catch (error) {
    console.error('Error during restore and cleanup:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the restore and cleanup
restoreAndRemoveSpecificTests()
  .then(() => {
    console.log('\nRestore and specific cleanup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Process failed:', error);
    process.exit(1);
  });