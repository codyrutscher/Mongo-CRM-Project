const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function syncDncStatusWithHubSpot() {
  console.log('Syncing DNC status with HubSpot DNC list...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  try {
    // First, check current DNC status in our database
    const currentDncCount = await Contact.countDocuments({ 
      source: 'hubspot',
      dncStatus: { $ne: 'callable' }
    });
    
    const currentCallableCount = await Contact.countDocuments({ 
      source: 'hubspot',
      dncStatus: 'callable'
    });
    
    console.log(`📊 Current database DNC status:`);
    console.log(`   DNC contacts: ${currentDncCount}`);
    console.log(`   Callable contacts: ${currentCallableCount}`);
    console.log(`   Target DNC: ~94,297`);
    
    // Step 1: Reset all contacts to callable first
    console.log('\n🔄 Step 1: Resetting all contacts to callable...');
    
    const resetResult = await Contact.updateMany(
      { source: 'hubspot' },
      {
        $set: {
          dncStatus: 'callable',
          dncDate: null,
          dncReason: null,
          complianceNotes: null
        },
        $pull: { tags: 'DNC' }
      }
    );
    
    console.log(`✅ Reset ${resetResult.modifiedCount} contacts to callable`);
    
    // Step 2: Fetch contacts from HubSpot DNC list (List ID: 6199)
    console.log('\n🔄 Step 2: Fetching contacts from HubSpot DNC list (ID: 6199)...');
    
    let after = undefined;
    let totalDncContacts = 0;
    let totalUpdated = 0;
    let batchNumber = 1;
    
    while (true) {
      try {
        console.log(`\nFetching DNC batch ${batchNumber}...`);
        
        // Get contacts from the DNC list
        const response = await axios.get(`https://api.hubapi.com/crm/v3/lists/6199/memberships`, {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            limit: 100,
            ...(after && { after })
          },
          timeout: 30000
        });

        const memberships = response.data.results;
        if (!memberships || memberships.length === 0) {
          console.log('No more DNC list members');
          break;
        }

        totalDncContacts += memberships.length;
        console.log(`  Got ${memberships.length} DNC contacts from HubSpot`);
        
        // Extract contact IDs from memberships
        const contactIds = memberships.map(membership => membership.recordId);
        
        // Update these contacts in our database to DNC status
        const updateResult = await Contact.updateMany(
          { 
            source: 'hubspot',
            sourceId: { $in: contactIds }
          },
          {
            $set: {
              dncStatus: 'dnc_internal',
              dncDate: new Date(),
              dncReason: 'HubSpot DNC List 6199',
              complianceNotes: 'Contact is on HubSpot DNC list - DO NOT CALL'
            },
            $addToSet: { tags: 'DNC' }
          }
        );
        
        totalUpdated += updateResult.modifiedCount;
        console.log(`  ✅ Updated ${updateResult.modifiedCount} contacts to DNC status`);
        
        // Check for next page
        if (response.data.paging && response.data.paging.next) {
          after = response.data.paging.next.after;
        } else {
          console.log('No more pages in DNC list');
          break;
        }

      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log('❌ DNC List 6199 not found or not accessible');
          break;
        } else if (error.response && error.response.status === 500) {
          console.log(`❌ 500 error in DNC batch ${batchNumber}, skipping...`);
          after = after ? (parseInt(after) + 100).toString() : '100';
        } else {
          console.log(`❌ Error in DNC batch ${batchNumber}:`, error.message);
          break;
        }
      }

      batchNumber++;
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Safety break
      if (batchNumber > 1000) {
        console.log('Safety break - too many batches');
        break;
      }
    }
    
    // If the list API doesn't work, try alternative approach using contact properties
    if (totalDncContacts === 0) {
      console.log('\n🔄 Alternative approach: Checking contact properties for DNC status...');
      
      // Fetch all contacts and check for DNC properties
      let contactAfter = undefined;
      let contactBatch = 1;
      
      while (contactBatch <= 1400) { // Limit to reasonable number
        try {
          console.log(`\nChecking contact batch ${contactBatch} for DNC properties...`);
          
          const contactResponse = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
            headers: {
              'Authorization': `Bearer ${hubspotToken}`,
              'Content-Type': 'application/json'
            },
            params: {
              limit: 100,
              properties: 'email,hs_email_optout,hs_legal_basis,gdpr_lawful_basis_for_processing_contact_data',
              ...(contactAfter && { after: contactAfter })
            },
            timeout: 30000
          });

          const contacts = contactResponse.data.results;
          if (!contacts || contacts.length === 0) {
            console.log('No more contacts to check');
            break;
          }

          // Check each contact for DNC indicators
          const dncContactIds = [];
          
          contacts.forEach(contact => {
            const props = contact.properties;
            
            // Check if contact has opted out or has DNC indicators
            if (props.hs_email_optout === 'true' || 
                props.hs_legal_basis === 'NOT_OPTED_IN' ||
                props.gdpr_lawful_basis_for_processing_contact_data === 'NOT_OPTED_IN') {
              dncContactIds.push(contact.id);
            }
          });
          
          if (dncContactIds.length > 0) {
            const altUpdateResult = await Contact.updateMany(
              { 
                source: 'hubspot',
                sourceId: { $in: dncContactIds }
              },
              {
                $set: {
                  dncStatus: 'dnc_internal',
                  dncDate: new Date(),
                  dncReason: 'HubSpot Email Opt-out or Legal Basis',
                  complianceNotes: 'Contact has opted out or lacks legal basis - DO NOT CALL'
                },
                $addToSet: { tags: 'DNC' }
              }
            );
            
            totalUpdated += altUpdateResult.modifiedCount;
            console.log(`  ✅ Found ${dncContactIds.length} DNC contacts, updated ${altUpdateResult.modifiedCount}`);
          }

          // Move to next batch
          if (contactResponse.data.paging && contactResponse.data.paging.next) {
            contactAfter = contactResponse.data.paging.next.after;
          } else {
            console.log('No more contact pages');
            break;
          }

        } catch (error) {
          if (error.response && error.response.status === 500) {
            console.log(`❌ 500 error in contact batch ${contactBatch}, skipping...`);
            contactAfter = contactAfter ? (parseInt(contactAfter) + 100).toString() : '100';
          } else {
            console.log(`❌ Error in contact batch ${contactBatch}:`, error.message);
            break;
          }
        }

        contactBatch++;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Final verification
    console.log('\n📊 Final DNC status verification...');
    
    const finalDncCount = await Contact.countDocuments({ 
      source: 'hubspot',
      dncStatus: { $ne: 'callable' }
    });
    
    const finalCallableCount = await Contact.countDocuments({ 
      source: 'hubspot',
      dncStatus: 'callable'
    });
    
    const totalContacts = finalDncCount + finalCallableCount;
    
    console.log(`📊 Final results:`);
    console.log(`   Total contacts: ${totalContacts}`);
    console.log(`   DNC contacts: ${finalDncCount}`);
    console.log(`   Callable contacts: ${finalCallableCount}`);
    console.log(`   Target DNC: ~94,297`);
    console.log(`   DNC Match: ${Math.abs(finalDncCount - 94297) <= 100 ? '✅ CLOSE' : '❌ OFF'}`);
    console.log(`   Difference from target: ${finalDncCount - 94297}`);
    
    console.log(`\nSync summary:`);
    console.log(`   HubSpot DNC contacts found: ${totalDncContacts}`);
    console.log(`   Database contacts updated: ${totalUpdated}`);
    
  } catch (error) {
    console.error('Error during DNC sync:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the DNC sync
syncDncStatusWithHubSpot()
  .then(() => {
    console.log('\nDNC status sync complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('DNC sync failed:', error);
    process.exit(1);
  });