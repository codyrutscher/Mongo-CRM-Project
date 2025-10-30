require('dotenv').config();
const axios = require('axios');

const apiId = process.env.RESPONSE_GENIUS_API_ID;
const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
const baseUrl = process.env.RESPONSE_GENIUS_API_URL;
const listId = process.env.RESPONSE_GENIUS_DNC_SELLER_LIST_ID;

async function testImport() {
  console.log('🧪 Testing Response Genius Import Endpoint\n');
  console.log(`API ID: ${apiId?.substring(0, 20)}...`);
  console.log(`List ID: ${listId}\n`);

  try {
    // Try to import a test contact
    const testContact = {
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone: '1234567890'
    };

    console.log('Attempting to import test contact...');
    const response = await axios.post(
      `${baseUrl}/lists/import_optin`,
      {
        list_api_identifier: listId,
        contacts: [testContact]
      },
      {
        params: {
          api_id: apiId,
          api_key: apiKey
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n✅ Import Successful!');
    console.log('Response type:', typeof response.data);
    
    if (typeof response.data === 'string') {
      if (response.data.includes('<!DOCTYPE html>')) {
        console.log('❌ ERROR: Received HTML login page');
        console.log('\nThis means the API credentials are being rejected.');
        console.log('Please verify at: https://control.responsegenius.com/help/api_identifier');
      } else {
        console.log('Response:', response.data.substring(0, 500));
      }
    } else {
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Import Failed');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      
      if (typeof error.response.data === 'string') {
        if (error.response.data.includes('<!DOCTYPE html>')) {
          console.log('\n❌ Received HTML login page - credentials are invalid');
        } else {
          console.error('Response:', error.response.data.substring(0, 300));
        }
      } else {
        console.error('Response:', error.response.data);
      }
    }
  }
}

testImport();
