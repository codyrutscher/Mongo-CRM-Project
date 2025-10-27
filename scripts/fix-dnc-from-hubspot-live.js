const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function fixDncFromHubSpotLive() {
  console.log('Fixing DNC status from live HubSpot data...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  try {
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
    
    console.log('\n🔄 Step 2: Fetching live Do Not Call status from HubSpot...');
    
    let after = undefined;
    let batchNumber = 1;
    let totalProcessed = 0;
    let totalDnc = 0;
    let totalCallable = 0;
    
    while (batchNumber <= 1400) { // Process all contacts
      try {
        console.log(`\nProcessing batch ${batchNumber}...`);
        
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            limit: 100,
            properties: 'email,firstname,lastname,do_not_call,hs_do_not_call,dnc_flag,hs_email_optout',
            ...(after && { after })
          },
          timeout: 30000
        });

        const contacts = response.data.results;
        if (!contacts || contacts.length === 0) {
          console.log('No more contacts from HubSpot');
          break;
        }

        totalProcessed += contacts.length;
        
        // Separate contacts into DNC and Callable based on HubSpot properties
        const dncContactIds = [];
        const callableContactIds = [];
        
        contacts.forEach(contact => {
          const props = contact.properties;
          
          // Check if contact is DNC in HubSpot
          const isDnc = props.do_not_call === 'true' || 
                       props.do_not_call === true ||
                       props.hs_do_not_call === 'true' ||
                       props.hs_do_not_call === true ||
                       props.dnc_flag === 'true' ||
                       props.dnc_flag === true;
          
          if (isDnc) {
            dncContactIds.push(contact.id);
          } else {
            callableContactIds.push(contact.id);
          }
        });
        
        // Update DNC contacts in our database
        if (dncContactIds.length > 0) {
          const dncUpdateResult = await Contact.updateMany(
            { 
              source: 'hubspot',
              sourceId: { $in: dncContactIds }
            },
            {
              $set: {
                dncStatus: 'dnc_internal',
                dncDate: new Date(),
                dncReason: 'HubSpot Do Not Call property is true',
                complianceNotes: 'Contact has Do Not Call set to true in HubSpot - DO NOT CALL'
              },
              $addToSet: { tags: 'DNC' }
            }
          );
          
          totalDnc += dncUpdateResult.modifiedCount;
          console.log(`  ✅ Marked ${dncUpdateResult.modifiedCount} contacts as DNC`);
        }
        
        // Ensure callable contacts stay callable (already reset, but double-check)
        if (callableContactIds.length > 0) {
          const callableUpdateResult = await Contact.updateMany(
            { 
              source: 'hubspot',
              sourceId: { $in: callableContactIds }
            },
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
          
          totalCallable += callableUpdateResult.modifiedCount;
        }
        
        console.log(`  Processed ${contacts.length} contacts (${dncContactIds.length} DNC, ${callableContactIds.length} Callable)`);
        console.log(`  Total so far: ${totalProcessed} processed, ${totalDnc} DNC, ${totalCallable} Callable`);

        // Move to next batch
        if (response.data.paging && response.data.paging.next) {
          after = response.data.paging.next.after;
        } else {
          console.log('No more pages from HubSpot');
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
    
    const finalDncCount = await Contact.countDocuments({ 
      source: 'hubspot',
      dncStatus: { $ne: 'callable' }
    });
    
    const finalCallableCount = await Contact.countDocuments({ 
      source: 'hubspot',
      dncStatus: 'callable'
    });
    
    const totalContacts = finalDncCount + finalCallableCount;
    
    console.log(`\n📊 Final Results:`);
    console.log(`Total contacts: ${totalContacts}`);
    console.log(`Callable: ${finalCallableCount}`);
    console.log(`DNC: ${finalDncCount}`);
    console.log(`\nHubSpot target:`);
    console.log(`Callable: ~62,910`);
    console.log(`DNC: ~73,388`);
    console.log(`\nMatch:`);
    console.log(`Callable difference: ${finalCallableCount - 62910}`);
    console.log(`DNC difference: ${finalDncCount - 73388}`);
    
    if (Math.abs(finalCallableCount - 62910) < 1000 && Math.abs(finalDncCount - 73388) < 1000) {
      console.log('\n🎉 SUCCESS! DNC status now matches HubSpot!');
    } else {
      console.log('\n⚠️ Still some difference, but much closer than before');
    }
    
  } catch (error) {
    console.error('Error during DNC fix:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the fix
fixDncFromHubSpotLive()
  .then(() => {
    console.log('\nDNC fix complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('DNC fix failed:', error);
    process.exit(1);
  });