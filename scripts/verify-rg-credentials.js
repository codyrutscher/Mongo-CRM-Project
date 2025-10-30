require('dotenv').config();
const axios = require('axios');

const apiId = process.env.RESPONSE_GENIUS_API_ID;
const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
const baseUrl = process.env.RESPONSE_GENIUS_API_URL;

async function verifyCredentials() {
  console.log('🔐 Verifying Response Genius Credentials\n');
  console.log(`API ID: ${apiId?.substring(0, 20)}...`);
  console.log(`API Key: ${apiKey?.substring(0, 20)}...`);
  console.log(`Base URL: ${baseUrl}\n`);

  try {
    // Try to get account info or lists
    console.log('Testing API connection...');
    const response = await axios.get(`${baseUrl}/lists/get_lists`, {
      params: {
        api_id: apiId,
        api_key: apiKey
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API Connection Successful!');
    console.log('\nResponse type:', typeof response.data);
    
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      console.log('❌ ERROR: Received HTML instead of JSON');
      console.log('This usually means:');
      console.log('  1. API credentials are invalid');
      console.log('  2. API endpoint is incorrect');
      console.log('  3. Authentication method is wrong');
      console.log('\nPlease verify your credentials at:');
      console.log('https://control.responsegenius.com/help/api_identifier');
    } else {
      console.log('Response data:', JSON.stringify(response.data, null, 2).substring(0, 500));
    }

  } catch (error) {
    console.error('❌ API Connection Failed');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data type:', typeof error.response.data);
      if (typeof error.response.data === 'string') {
        console.error('Response preview:', error.response.data.substring(0, 200));
      }
    }
  }
}

verifyCredentials();
