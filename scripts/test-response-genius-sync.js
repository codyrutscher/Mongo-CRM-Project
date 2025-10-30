require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

const RESPONSE_GENIUS_API_ID = process.env.RESPONSE_GENIUS_API_ID;
const RESPONSE_GENIUS_API_KEY = process.env.RESPONSE_GENIUS_API_KEY;
const RESPONSE_GENIUS_API_URL = process.env.RESPONSE_GENIUS_API_URL;

async function testSync() {
  try {
    console.log('🧪 Testing Response Genius Sync\n');
    
    // Connect to database
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Get one contact with seller DNC
    const testContact = await Contact.findOne({
      dnc___seller_outreach: true,
      email: { $exists: true, $ne: null, $ne: '' }
    }).select('email firstName lastName phone');

    if (!testContact) {
      console.log('❌ No test contact found');
      process.exit(1);
    }

    console.log('Test Contact:');
    console.log(`  Email: ${testContact.email}`);
    console.log(`  Name: ${testContact.firstName} ${testContact.lastName}`);
    console.log(`  Phone: ${testContact.phone || 'N/A'}`);
    
    // Test sync to DNC Seller list
    const listId = process.env.RESPONSE_GENIUS_DNC_SELLER_LIST_ID;
    console.log(`\nSyncing to list: ${listId}`);
    
    const response = await axios.post(`${RESPONSE_GENIUS_API_URL}/lists/import_optin`, {
      list_api_identifier: listId,
      contacts: [{
        email: testContact.email,
        first_name: testContact.firstName || '',
        last_name: testContact.lastName || '',
        phone: testContact.phone || ''
      }]
    }, {
      params: {
        api_id: RESPONSE_GENIUS_API_ID,
        api_key: RESPONSE_GENIUS_API_KEY
      }
    });

    console.log('\n✅ Sync successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Verify it was added
    console.log('\nVerifying list count...');
    const listResponse = await axios.get(`${RESPONSE_GENIUS_API_URL}/lists/get_list`, {
      params: {
        api_id: RESPONSE_GENIUS_API_ID,
        api_key: RESPONSE_GENIUS_API_KEY,
        list_api_identifier: listId
      }
    });
    
    console.log(`List subscriber count: ${listResponse.data?.list?.subscriber_count || 0}`);
    console.log('\n✅ Test complete! Ready for bulk sync.');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  } finally {
    await mongoose.connection.close();
  }
}

testSync();
