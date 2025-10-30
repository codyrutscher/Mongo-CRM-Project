require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const responseGenius8ListsService = require('../src/services/responseGenius8ListsService');

async function testWebhookSync() {
  try {
    console.log('🧪 Testing Webhook Response Genius Sync\n');
    
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Find a contact with seller DNC
    const testContact = await Contact.findOne({
      dnc___seller_outreach: true,
      email: { $exists: true, $ne: null, $ne: '' }
    });

    if (!testContact) {
      console.log('❌ No test contact found');
      process.exit(1);
    }

    console.log('Test Contact:');
    console.log(`  Email: ${testContact.email}`);
    console.log(`  Name: ${testContact.firstName} ${testContact.lastName}`);
    console.log(`  DNC Seller: ${testContact.dnc___seller_outreach}`);
    
    console.log('\nTesting sync to Response Genius...');
    const result = await responseGenius8ListsService.handleContactPropertyChange(
      testContact,
      'dnc___seller_outreach'
    );

    console.log('\nResult:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Webhook sync is working!');
      console.log('Future HubSpot updates will automatically sync to Response Genius');
    } else {
      console.log('\n❌ Sync failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testWebhookSync();
