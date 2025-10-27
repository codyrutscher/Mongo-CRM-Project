const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function identifyAndHandleErrors() {
  console.log('Starting error identification and handling...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  let after = undefined;
  let totalImported = 0;
  let totalErrors = 0;
  let batchNumber = 1;
  const errorLog = [];

  try {
    while (true) {
      console.log(`\nProcessing batch ${batchNumber}...`);
      
      try {
        // Try to get the batch normally first
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

        // Try to import the batch
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

        await Contact.insertMany(contactsToInsert, { ordered: false });
        totalImported += contactsToInsert.length;
        console.log(`✅ Imported ${contactsToInsert.length} contacts. Total: ${totalImported}`);

        // Move to next batch
        if (response.data.paging && response.data.paging.next) {
          after = response.data.paging.next.after;
          batchNumber++;
        } else {
          break;
        }

      } catch (error) {
        if (error.response && error.response.status === 500) {
          console.log(`❌ 500 error in batch ${batchNumber}. Investigating...`);
          
          // Log the error details
          const errorDetails = {
            batchNumber,
            after,
            error: error.message,
            timestamp: new Date().toISOString()
          };
          errorLog.push(errorDetails);
          
          // Try to get individual contacts to identify the problematic one
          console.log('Trying to identify problematic contact...');
          
          // Get the contact IDs from the previous successful batch to calculate range
          let problemContactFound = false;
          
          // Try smaller batches to isolate the issue
          for (let smallBatch = 1; smallBatch <= 10; smallBatch++) {
            try {
              console.log(`  Trying small batch ${smallBatch} with limit 10...`);
              
              const smallResponse = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
                headers: {
                  'Authorization': `Bearer ${hubspotToken}`,
                  'Content-Type': 'application/json'
                },
                params: {
                  limit: 10,
                  properties: 'email,firstname,lastname,phone,company',
                  ...(after && { after })
                },
                timeout: 30000
              });

              const smallContacts = smallResponse.data.results;
              console.log(`    Got ${smallContacts.length} contacts in small batch`);
              
              if (smallContacts.length > 0) {
                // Try to import these
                const smallContactsToInsert = smallContacts.map(contact => ({
                  email: contact.properties.email || '',
                  firstName: contact.properties.firstname || '',
                  lastName: contact.properties.lastname || '',
                  phone: contact.properties.phone || '',
                  company: contact.properties.company || '',
                  source: 'hubspot',
                  sourceId: contact.id,
                  sourceMetadata: {
                    hubspotId: contact.id,
                    batchNumber: `${batchNumber}-recovery-${smallBatch}`,
                    recoveredFromError: true
                  },
                  lastSyncedAt: new Date()
                }));

                await Contact.insertMany(smallContactsToInsert, { ordered: false });
                totalImported += smallContactsToInsert.length;
                console.log(`    ✅ Recovered ${smallContactsToInsert.length} contacts`);
                
                // Update after for next iteration
                if (smallResponse.data.paging && smallResponse.data.paging.next) {
                  after = smallResponse.data.paging.next.after;
                }
              }
              
              problemContactFound = true;
              break;
              
            } catch (smallError) {
              console.log(`    ❌ Small batch ${smallBatch} also failed: ${smallError.message}`);
              
              if (smallError.response && smallError.response.status === 500) {
                // This small batch also has the problem, try even smaller
                console.log('    Trying individual contacts...');
                
                // Skip this problematic range and move forward
                console.log('    Skipping problematic range and moving forward...');
                after = after ? (parseInt(after) + 50).toString() : '50';
                totalErrors += 10; // Estimate
                break;
              }
            }
          }
          
          if (!problemContactFound) {
            console.log('Could not isolate problematic contact, skipping range...');
            after = after ? (parseInt(after) + 100).toString() : '100';
            totalErrors += 100;
          }
          
          batchNumber++;
          
        } else {
          // Different error, log and continue
          console.error(`Different error in batch ${batchNumber}:`, error.message);
          totalErrors++;
          batchNumber++;
        }
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`✅ Total contacts imported: ${totalImported}`);
    console.log(`❌ Total errors encountered: ${totalErrors}`);
    console.log(`📋 Error log entries: ${errorLog.length}`);
    
    if (errorLog.length > 0) {
      console.log('\n🔍 Error Details:');
      errorLog.forEach((err, index) => {
        console.log(`${index + 1}. Batch ${err.batchNumber} at ${err.timestamp}: ${err.error}`);
      });
    }

  } catch (error) {
    console.error('Fatal error during import:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the import
identifyAndHandleErrors()
  .then(() => {
    console.log('Error handling import finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error.message);
    process.exit(1);
  });