require('dotenv').config();
const axios = require('axios');

async function testSuppressionAPI() {
  console.log('=== Testing Response Genius Suppression API ===\n');

  const apiId = process.env.RESPONSE_GENIUS_API_ID;
  const apiKey = process.env.RESPONSE_GENIUS_API_KEY;

  console.log(`API ID: ${apiId}`);
  console.log(`API Key: ${apiKey}\n`);

  // Test adding to suppression list
  console.log('🧪 Testing: Add to suppression list...\n');

  const testData = {
    list_name: 'dnc___seller_outreach',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User'
  };

  try {
    const response = await axios.post(
      'https://control.responsegenius.com/api/v1/suppression/add',
      testData,
      {
        params: {
          api_id: apiId,
          api_key: apiKey
        }
      }
    );

    console.log('✅ SUCCESS!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

testSuppressionAPI();
