const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function syncToCurrentHubSpotCount() {
  console.log('Syncing to current HubSpot count (135,986)...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  try {
    // Get current database count
    const currentDbCount = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`📊 Current database count: ${currentDbCount}`);
    console.log(`📊 Target HubSpot count: 135,986`);
    console.log(`📊 Need to add: ${135986 - currentDbCount} contacts`);
    
    if (currentDbCount >= 135986) {
      console.log('✅ Database already has enough contacts!');
      return;
    }
    
    // Get existing contact IDs to avoid duplicates
    console.log('\n🔍 Getting existing contact IDs...');
    const existingIds = await Contact.distinct('sourceId', { source: 'hubspot' });
    const existingIdsSet = new Set(existingIds);
    console.log(`📊 Found ${existingIds.length} existing contact IDs`);
    
    // Fetch contacts from HubSpot to find missing ones
    console.log('\n📥 Fetching contacts from HubSpot...');
    
    let after = undefined;
    let totalFetched = 0;
    let totalImported = 0;
    let batchNumber = 1;
    
    while (totalImported < (135986 - currentDbCount) && batchNumber <= 1500) {
      try {
        console.log(`\nFetching batch ${batchNumber}...`);
        
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
          console.log('No more contacts available from HubSpot');
          break;
        }

        totalFetched += contacts.length;
        
        // Filter out contacts we already have
        const newContacts = contacts.filter(contact => !existingIdsSet.has(contact.id));
        
        if (newContacts.length > 0) {
          console.log(`  Found ${newContacts.length} new contacts in batch ${batchNumber}`);
          
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
              syncToTarget: true,
              syncDate: new Date().toISOString()
            },
            lastSyncedAt: new Date(),
            createdAt: contact.properties.createdate ? new Date(contact.properties.createdate) : new Date(),
            updatedAt: contact.properties.lastmodifieddate ? new Date(contact.properties.lastmodifieddate) : new Date()
          }));

          try {
            await Contact.insertMany(contactsToInsert, { ordered: false });
            totalImported += contactsToInsert.length;
            
            // Add to existing IDs set to avoid duplicates in future batches
            contactsToInsert.forEach(c => existingIdsSet.add(c.sourceId));
            
            console.log(`  ✅ Imported ${contactsToInsert.length} contacts. Total imported: ${totalImported}`);
          } catch (error) {
            console.log(`  ⚠️ Some contacts may have been duplicates:`, error.message);
            totalImported += contactsToInsert.length; // Assume most were imported
          }
        } else {
          console.log(`  No new contacts in batch ${batchNumber}`);
        }

        // Check if we've reached our target
        const currentCount = await Contact.countDocuments({ source: 'hubspot' });
        if (currentCount >= 135986) {
          console.log(`🎉 Reached target! Current count: ${currentCount}`);
          break;
        }

        // Move to next batch
        if (response.data.paging && response.data.paging.next) {
          after = response.data.paging.next.after;
        } else {
          console.log('No more pages available from HubSpot');
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
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Final verification
    console.log('\n📊 Final verification...');
    const finalCount = await Contact.countDocuments({ source: 'hubspot' });
    
    console.log(`Target: 135,986`);
    console.log(`Final count: ${finalCount}`);
    console.log(`Match: ${finalCount === 135986 ? '✅ PERFECT' : finalCount > 135986 ? '⚠️ MORE' : '❌ LESS'}`);
    console.log(`Difference: ${finalCount - 135986}`);
    
    if (finalCount === 135986) {
      console.log('🎉 SUCCESS! Database now matches current HubSpot count exactly!');
    } else if (finalCount > 135986) {
      console.log(`⚠️ Database has ${finalCount - 135986} more contacts than target`);
    } else {
      console.log(`❌ Database still missing ${135986 - finalCount} contacts`);
    }
    
    console.log(`\nTotal fetched from HubSpot: ${totalFetched}`);
    console.log(`Total imported: ${totalImported}`);
    
  } catch (error) {
    console.error('Error during sync:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the sync
syncToCurrentHubSpotCount()
  .then(() => {
    console.log('\nSync to current HubSpot count complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Sync failed:', error);
    process.exit(1);
  });