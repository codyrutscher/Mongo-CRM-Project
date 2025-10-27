const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function fastSimpleImport() {
  console.log('Starting fast simple HubSpot import...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  let after = undefined;
  let totalImported = 0;
  let batchNumber = 1;

  try {
    while (true) {
      console.log(`\nProcessing batch ${batchNumber}...`);
      
      // Get contacts with ONLY essential properties
      const url = 'https://api.hubapi.com/crm/v3/objects/contacts';
      const params = {
        limit: 100,
        properties: 'email,firstname,lastname,phone,company,jobtitle,city,state,country,lifecyclestage,createdate,lastmodifieddate',
        ...(after && { after })
      };

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 30000
      });

      const contacts = response.data.results;
      
      if (!contacts || contacts.length === 0) {
        console.log('No more contacts to process');
        break;
      }

      console.log(`Got ${contacts.length} contacts from HubSpot`);

      // Batch insert for speed
      const contactsToInsert = contacts.map(contact => ({
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
          originalData: contact.properties
        },
        lastSyncedAt: new Date(),
        createdAt: contact.properties.createdate ? new Date(contact.properties.createdate) : new Date(),
        updatedAt: contact.properties.lastmodifieddate ? new Date(contact.properties.lastmodifieddate) : new Date()
      }));

      try {
        // Use insertMany for much faster bulk insert
        await Contact.insertMany(contactsToInsert, { ordered: false });
        totalImported += contactsToInsert.length;
        console.log(`✅ Imported ${contactsToInsert.length} contacts. Total: ${totalImported}`);
      } catch (error) {
        // Handle duplicates gracefully
        if (error.code === 11000) {
          console.log(`⚠️  Some duplicates skipped in batch ${batchNumber}`);
          totalImported += contactsToInsert.length;
        } else {
          console.error(`Error in batch ${batchNumber}:`, error.message);
        }
      }

      // Check for next page
      if (response.data.paging && response.data.paging.next) {
        after = response.data.paging.next.after;
        batchNumber++;
      } else {
        break;
      }

      // Very small delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`\n🎉 Import complete! Total contacts imported: ${totalImported}`);

  } catch (error) {
    console.error('Error during import:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the import
fastSimpleImport()
  .then(() => {
    console.log('Fast import finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error.message);
    process.exit(1);
  });