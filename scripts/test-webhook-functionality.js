const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const webhookService = require('../src/services/webhookService');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function testWebhookFunctionality() {
  console.log('Testing webhook functionality...');
  
  try {
    // Test 1: Check current contact count
    const currentCount = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`📊 Current HubSpot contacts in DB: ${currentCount}`);
    
    // Test 2: Get webhook stats
    console.log('\n📈 Getting webhook stats...');
    const stats = await webhookService.getWebhookStats();
    console.log('Webhook Stats:', {
      totalContacts: stats.totalContacts,
      todayUpdates: stats.todayUpdates,
      recentErrors: stats.recentErrors,
      webhookUrl: stats.webhookUrl
    });
    
    // Test 3: Get realtime segment counts
    console.log('\n📊 Getting realtime segment counts...');
    const segmentCounts = await webhookService.getRealtimeSegmentCounts();
    console.log('Segment Counts:', {
      total: segmentCounts.total,
      hubspotContacts: segmentCounts.hubspotContacts,
      newLeads: segmentCounts.newLeads,
      prospects: segmentCounts.prospects,
      customers: segmentCounts.customers
    });
    
    // Test 4: Test webhook event processing (simulate)
    console.log('\n🔄 Testing webhook event processing...');
    
    // Get a sample contact to test with
    const sampleContact = await Contact.findOne({ source: 'hubspot' });
    if (sampleContact) {
      console.log(`Using sample contact: ${sampleContact.firstName} ${sampleContact.lastName} (ID: ${sampleContact.sourceId})`);
      
      // Simulate a property change webhook
      const mockWebhookEvent = {
        subscriptionType: 'contact.propertyChange',
        objectId: sampleContact.sourceId,
        propertyName: 'firstname',
        propertyValue: sampleContact.firstName,
        changeSource: 'CRM_UI'
      };
      
      console.log('Simulating webhook event:', mockWebhookEvent);
      
      try {
        await webhookService.processWebhookEvent(mockWebhookEvent);
        console.log('✅ Webhook event processed successfully');
      } catch (error) {
        console.log('❌ Webhook event processing failed:', error.message);
      }
    } else {
      console.log('❌ No sample contact found for testing');
    }
    
    // Test 5: Check DNC functionality
    console.log('\n🚫 Testing DNC functionality...');
    const dncContacts = await Contact.countDocuments({ 
      source: 'hubspot',
      dncStatus: { $ne: 'callable' }
    });
    console.log(`DNC contacts: ${dncContacts}`);
    
    const callableContacts = await Contact.countDocuments({ 
      source: 'hubspot',
      dncStatus: 'callable'
    });
    console.log(`Callable contacts: ${callableContacts}`);
    
    // Test 6: Check for contacts updated today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const updatedToday = await Contact.countDocuments({
      source: 'hubspot',
      lastSyncedAt: { $gte: today }
    });
    console.log(`Contacts updated today: ${updatedToday}`);
    
    // Test 7: Check for any sync errors
    const contactsWithErrors = await Contact.countDocuments({
      source: 'hubspot',
      syncErrors: { $ne: [] }
    });
    console.log(`Contacts with sync errors: ${contactsWithErrors}`);
    
    if (contactsWithErrors > 0) {
      const errorSamples = await Contact.find({
        source: 'hubspot',
        syncErrors: { $ne: [] }
      }).limit(3);
      
      console.log('\nSample sync errors:');
      errorSamples.forEach((contact, index) => {
        const latestError = contact.syncErrors[contact.syncErrors.length - 1];
        console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName}: ${latestError.error}`);
      });
    }
    
    console.log('\n✅ Webhook functionality test complete');
    
  } catch (error) {
    console.error('Error during webhook test:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
testWebhookFunctionality()
  .then(() => {
    console.log('\nWebhook test finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Webhook test failed:', error);
    process.exit(1);
  });