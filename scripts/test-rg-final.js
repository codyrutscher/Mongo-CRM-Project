require('dotenv').config();
const axios = require('axios');

const apiId = process.env.RESPONSE_GENIUS_API_ID;
const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
const baseUrl = process.env.RESPONSE_GENIUS_API_URL;
const listId = process.env.RESPONSE_GENIUS_DNC_SELLER_LIST_ID;

async function testImport() {
  console.log('🧪 Testing Response Genius Import\n');
  console.log(`API ID: ${apiId?.substring(0, 20)}...`);
  console.log(`List ID: ${listId}\n`);

  const testContact = {
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    phone: '1234567890'
  };

  try {
    console.log('Attempting GET to /lists/subscribe_user...');
    
    // Use subscribe_user for single contact
    const response = await axios.get(
      `${baseUrl}/lists/subscribe_user`,
      {
        params: {
          api_id: apiId,
          api_key: apiKey,
          list_api_identifier: listId,
          email_address: testContact.email,
          first_name: testContact.first_name,
          last_name: testContact.last_name,
          phone: testContact.phone
        }
      }
    );

    console.log('✅ Import Successful!');
    console.log('Response type:', typeof response.data);
    console.log('Status:', response.status);
    
    if (typeof response.data === 'string') {
      if (response.data.includes('<!DOCTYPE html>')) {
        console.log('❌ ERROR: Received HTML instead of JSON');
        console.log('Preview:', response.data.substring(0, 300));
      } else {
        console.log('Response:', response.data);
      }
    } else {
      console.log('✅ Got JSON response!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }

    // Now try to get the list to verify
    console.log('\n\nVerifying list...');
    const listResponse = await axios.get(`${baseUrl}/lists/get_list`, {
      params: {
        api_id: apiId,
        api_key: apiKey,
        list_api_identifier: listId
      }
    });

    if (typeof listResponse.data === 'object') {
      console.log('✅ List retrieved!');
      console.log('Subscriber count:', listResponse.data?.list?.subscriber_count || 'N/A');
    } else {
      console.log('List response type:', typeof listResponse.data);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      
      if (typeof error.response.data === 'string') {
        if (error.response.data.includes('<!DOCTYPE html>')) {
          console.log('\n❌ Received HTML login page');
          console.log('This means the API credentials are invalid or the endpoint is wrong');
        } else {
          console.error('Response:', error.response.data.substring(0, 500));
        }
      } else {
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

testImport();
