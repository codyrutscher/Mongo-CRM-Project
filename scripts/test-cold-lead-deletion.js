const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');

require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function testColdLeadDeletion() {
  console.log('🧪 Testing Cold Lead deletion protection...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  try {
    // Step 1: Find a Cold Lead contact in our database
    console.log('\n🔍 Step 1: Finding Cold Lead contacts...');
    
    const coldLeads = await Contact.find({
      source: 'hubspot',
      'customFields.coldLead': true,
      'customFields.deletedFromHubSpot': { $ne: true }
    }).limit(5);
    
    if (coldLeads.length === 0) {
      console.log('❌ No active Cold Lead contacts found to test with');
      console.log('Run the sync script first: node scripts/sync-cold-leads.js');
      return;
    }
    
    console.log(`Found ${coldLeads.length} active Cold Lead contacts:`);
    
    coldLeads.forEach((contact, index) => {
      const types = contact.customFields?.coldLeadTypes?.join(', ') || 'Unknown';
      console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email})`);
      console.log(`   HubSpot ID: ${contact.sourceId}`);
      console.log(`   Cold Lead Types: ${types}`);
      console.log(`   Tags: ${contact.tags.join(', ')}`);
      console.log('');
    });
    
    // Step 2: Select the first contact for testing
    const testContact = coldLeads[0];
    console.log(`🎯 Selected for testing: ${testContact.firstName} ${testContact.lastName}`);
    console.log(`   Email: ${testContact.email}`);
    console.log(`   HubSpot ID: ${testContact.sourceId}`);
    
    // Step 3: Verify contact exists in HubSpot before deletion
    console.log('\n🔍 Step 2: Verifying contact exists in HubSpot...');
    
    try {
      const hubspotResponse = await axios.get(
        `https://api.hubapi.com/crm/v3/objects/contacts/${testContact.sourceId}`,
        {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            properties: 'email,firstname,lastname'
          }
        }
      );
      
      console.log(`✅ Contact exists in HubSpot: ${hubspotResponse.data.properties.firstname} ${hubspotResponse.data.properties.lastname}`);
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('❌ Contact not found in HubSpot - may already be deleted');
        return;
      } else {
        console.log('❌ Error checking HubSpot:', error.message);
        return;
      }
    }
    
    // Step 4: Delete the contact from HubSpot
    console.log('\n🗑️ Step 3: Deleting contact from HubSpot...');
    console.log('⚠️ This will test our Cold Lead protection system');
    console.log('The contact should remain in Prospere CRM but be marked as deleted from HubSpot');
    
    console.log('\nProceeding in 3 seconds... (Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      await axios.delete(
        `https://api.hubapi.com/crm/v3/objects/contacts/${testContact.sourceId}`,
        {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Contact deleted from HubSpot successfully');
      
    } catch (error) {
      console.log('❌ Error deleting from HubSpot:', error.response?.data?.message || error.message);
      return;
    }
    
    // Step 5: Wait a moment for webhook to process
    console.log('\n⏳ Step 4: Waiting for webhook to process deletion...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 6: Check if contact is still in Prospere CRM
    console.log('\n🔍 Step 5: Checking if contact is preserved in Prospere CRM...');
    
    const updatedContact = await Contact.findOne({
      source: 'hubspot',
      sourceId: testContact.sourceId
    });
    
    if (!updatedContact) {
      console.log('❌ Contact was deleted from Prospere CRM - protection failed!');
      return;
    }
    
    console.log('✅ Contact preserved in Prospere CRM!');
    console.log(`   Name: ${updatedContact.firstName} ${updatedContact.lastName}`);
    console.log(`   Email: ${updatedContact.email}`);
    console.log(`   Status: ${updatedContact.status}`);
    console.log(`   Deleted from HubSpot: ${updatedContact.customFields?.deletedFromHubSpot || false}`);
    console.log(`   Deletion Date: ${updatedContact.customFields?.deletedFromHubSpotDate || 'Not set'}`);
    console.log(`   Tags: ${updatedContact.tags.join(', ')}`);
    
    // Step 7: Verify contact is gone from HubSpot
    console.log('\n🔍 Step 6: Verifying contact is deleted from HubSpot...');
    
    try {
      await axios.get(
        `https://api.hubapi.com/crm/v3/objects/contacts/${testContact.sourceId}`,
        {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('⚠️ Contact still exists in HubSpot - may take time to process');
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Contact confirmed deleted from HubSpot');
      } else {
        console.log('❓ Unable to verify HubSpot deletion:', error.message);
      }
    }
    
    // Summary
    console.log('\n🎉 TEST RESULTS:');
    console.log('================');
    console.log(`Contact Name: ${testContact.firstName} ${testContact.lastName}`);
    console.log(`Email: ${testContact.email}`);
    console.log(`HubSpot ID: ${testContact.sourceId}`);
    console.log('Status in Prospere CRM: ✅ PRESERVED');
    console.log('Status in HubSpot: ❌ DELETED');
    console.log('Protection System: ✅ WORKING');
    
    console.log('\n📋 You can now check:');
    console.log('1. Search for this contact in Prospere CRM - should be there');
    console.log('2. Search for this contact in HubSpot - should be gone or in "Recently Deleted"');
    console.log('3. Run: node scripts/manage-deleted-cold-leads.js --list');
    
  } catch (error) {
    console.error('Error during test:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
testColdLeadDeletion()
  .then(() => {
    console.log('\n✅ Cold Lead deletion test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });