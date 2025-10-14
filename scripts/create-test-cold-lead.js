const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function createTestColdLead() {
  console.log('🧪 Creating test Cold Lead contact...');
  
  try {
    // Create a test Cold Lead contact
    const testContact = new Contact({
      email: 'test.coldlead@example.com',
      firstName: 'John',
      lastName: 'TestColdLead',
      phone: '555-123-4567',
      company: 'Test Company Inc',
      source: 'hubspot',
      sourceId: 'TEST123456789', // Fake HubSpot ID for testing
      lifecycleStage: 'lead',
      leadSource: 'hubspot_cold_lead',
      tags: ['Cold Lead', 'Cold Lead - Seller', 'Cold Lead - Buyer'],
      customFields: {
        coldLead: true,
        coldLeadTypes: ['Seller', 'Buyer'],
        sellerColdLead: true,
        buyerColdLead: true,
        creColdLead: false,
        exfColdLead: false,
        coldLeadSyncDate: new Date().toISOString(),
        hubspotId: 'TEST123456789'
      },
      lastSyncedAt: new Date()
    });
    
    await testContact.save();
    
    console.log('✅ Test Cold Lead contact created:');
    console.log(`   Name: ${testContact.firstName} ${testContact.lastName}`);
    console.log(`   Email: ${testContact.email}`);
    console.log(`   HubSpot ID: ${testContact.sourceId}`);
    console.log(`   Cold Lead Types: ${testContact.customFields.coldLeadTypes ? testContact.customFields.coldLeadTypes.join(', ') : 'Seller, Buyer'}`);
    console.log(`   Tags: ${testContact.tags ? testContact.tags.join(', ') : 'Cold Lead'}`);
    
    // Now simulate the webhook deletion process
    console.log('\n🔄 Simulating webhook deletion process...');
    
    // This is what the webhook would do when it receives a deletion event
    testContact.customFields.deletedFromHubSpot = true;
    testContact.customFields.deletedFromHubSpotDate = new Date().toISOString();
    testContact.customFields.hubspotDeletionReason = 'Contact deleted from HubSpot (Cold Lead preserved)';
    
    // Add deletion tag
    if (!testContact.tags.includes('Deleted from HubSpot')) {
      testContact.tags.push('Deleted from HubSpot');
    }
    
    // Keep status as active
    testContact.status = 'active';
    testContact.lastSyncedAt = new Date();
    
    await testContact.save();
    
    console.log('✅ Simulated deletion from HubSpot - contact preserved:');
    console.log(`   Status: ${testContact.status}`);
    console.log(`   Deleted from HubSpot: ${testContact.customFields.deletedFromHubSpot}`);
    console.log(`   Deletion Date: ${testContact.customFields.deletedFromHubSpotDate}`);
    console.log(`   Tags: ${testContact.tags.join(', ')}`);
    
    console.log('\n🎯 TEST CONTACT DETAILS:');
    console.log('========================');
    console.log(`Name: ${testContact.firstName} ${testContact.lastName}`);
    console.log(`Email: ${testContact.email}`);
    console.log(`HubSpot ID: ${testContact.sourceId}`);
    console.log('Status: ✅ PRESERVED in Prospere CRM');
    console.log('Simulated HubSpot Status: ❌ DELETED');
    
    console.log('\n📋 You can now verify:');
    console.log('1. Run: node scripts/manage-deleted-cold-leads.js --list');
    console.log('2. This contact should appear in the "deleted from HubSpot" list');
    console.log('3. The contact remains active and searchable in Prospere CRM');
    
  } catch (error) {
    console.error('Error creating test contact:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
createTestColdLead()
  .then(() => {
    console.log('\n✅ Test Cold Lead creation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });