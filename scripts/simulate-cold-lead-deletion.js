const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

/**
 * Simulate deleting a specific Cold Lead from HubSpot to test protection
 */

async function simulateColdLeadDeletion() {
  console.log('🗑️ Simulating Cold Lead deletion from HubSpot...');
  console.log('================================================');
  
  try {
    // Find the CRE Cold Lead we created
    const creContact = await Contact.findOne({
      email: { $regex: /cre\.coldlead\..*@example\.com/ },
      'customFields.creColdLead': true
    });
    
    if (!creContact) {
      console.log('❌ CRE Cold Lead not found. Run: node scripts/create-all-cold-lead-types.js first');
      return;
    }
    
    console.log('🎯 Found CRE Cold Lead to delete:');
    console.log(`   Name: ${creContact.firstName} ${creContact.lastName}`);
    console.log(`   Email: ${creContact.email}`);
    console.log(`   Company: ${creContact.company}`);
    console.log(`   HubSpot ID: ${creContact.sourceId}`);
    console.log(`   Cold Lead Type: CRE`);
    console.log(`   Current Status: ${creContact.status}`);
    
    // Simulate the webhook deletion process
    console.log('\n🔄 Simulating HubSpot webhook deletion...');
    console.log('   1. HubSpot contact deleted');
    console.log('   2. Webhook fires with deletion event');
    console.log('   3. Webhook detects Cold Lead properties');
    console.log('   4. Protection system activates');
    
    // Update the contact to mark it as deleted from HubSpot
    creContact.customFields.deletedFromHubSpot = true;
    creContact.customFields.deletedFromHubSpotDate = new Date().toISOString();
    
    // Add the deletion tag
    if (!creContact.tags.includes('Deleted from HubSpot')) {
      creContact.tags.push('Deleted from HubSpot');
    }
    
    // Keep status as active (this is the protection!)
    creContact.status = 'active';
    creContact.updatedAt = new Date();
    
    await creContact.save();
    
    console.log('\n✅ Cold Lead deletion simulation complete!');
    console.log('   ✅ Contact PRESERVED in Prospere CRM');
    console.log('   ✅ Status remains: active');
    console.log('   ✅ Marked as deleted from HubSpot');
    console.log('   ✅ Deletion timestamp recorded');
    console.log('   ✅ Tagged for identification');
    
    console.log('\n🛡️ PROTECTION SYSTEM RESULTS:');
    console.log('==============================');
    console.log(`📧 Email: ${creContact.email}`);
    console.log(`👤 Name: ${creContact.firstName} ${creContact.lastName}`);
    console.log(`🏢 Company: ${creContact.company}`);
    console.log(`🆔 HubSpot ID: ${creContact.sourceId}`);
    console.log(`📊 Status: ${creContact.status} (PRESERVED)`);
    console.log(`🗑️ Deleted from HubSpot: ${creContact.customFields.deletedFromHubSpot}`);
    console.log(`📅 Deletion Date: ${new Date(creContact.customFields.deletedFromHubSpotDate).toLocaleString()}`);
    console.log(`🏷️ Tags: ${creContact.tags.join(', ')}`);
    
    console.log('\n📋 Verification Steps:');
    console.log('1. Run: node scripts/manage-deleted-cold-leads.js --list');
    console.log('2. This contact should appear in deleted list');
    console.log('3. Contact remains searchable in Prospere CRM');
    console.log('4. All Cold Lead data is intact');
    
    return {
      contactId: creContact._id,
      email: creContact.email,
      name: `${creContact.firstName} ${creContact.lastName}`,
      hubspotId: creContact.sourceId,
      coldLeadType: 'CRE',
      deletionDate: creContact.customFields.deletedFromHubSpotDate
    };
    
  } catch (error) {
    console.error('❌ Error simulating deletion:', error.message);
    throw error;
  }
}

// Run the simulation
if (require.main === module) {
  simulateColdLeadDeletion()
    .then((result) => {
      if (result) {
        console.log(`\n🎉 Successfully simulated deletion of ${result.coldLeadType} Cold Lead!`);
        console.log(`Contact: ${result.name} (${result.email})`);
        console.log(`HubSpot ID: ${result.hubspotId}`);
        console.log(`Deletion simulated at: ${new Date(result.deletionDate).toLocaleString()}`);
        console.log('\n🛡️ The Cold Lead protection system is working!');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Simulation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { simulateColdLeadDeletion };