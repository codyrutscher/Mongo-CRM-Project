require('dotenv').config();
const axios = require('axios');

/**
 * Test Response Genius credentials to verify they work
 */

async function testCredentials() {
  console.log('=== Testing Response Genius Credentials ===\n');

  const apiId = process.env.RESPONSE_GENIUS_API_ID;
  const apiKey = process.env.RESPONSE_GENIUS_API_KEY;

  if (!apiId || apiId === 'your_api_id_here') {
    console.log('❌ RESPONSE_GENIUS_API_ID not set in .env file');
    console.log('\nPlease add to .env:');
    console.log('RESPONSE_GENIUS_API_ID=your_actual_id_here');
    return;
  }

  if (!apiKey || apiKey === 'your_api_key_here') {
    console.log('❌ RESPONSE_GENIUS_API_KEY not set in .env file');
    console.log('\nPlease add to .env:');
    console.log('RESPONSE_GENIUS_API_KEY=your_actual_key_here');
    return;
  }

  console.log('✅ Credentials found in .env file');
  console.log(`   API ID: ${apiId.substring(0, 8)}...`);
  console.log(`   API Key: ${apiKey.substring(0, 8)}...\n`);

  // Test 1: Check account status
  console.log('🧪 Test 1: Checking account status...');
  try {
    const response = await axios.get(
      'https://control.responsegenius.com/api/v1/account/status',
      {
        params: {
          api_id: apiId,
          api_key: apiKey
        }
      }
    );

    console.log('✅ SUCCESS! Credentials are valid!');
    console.log('\nAccount Info:');
    console.log(`   Company: ${response.data.company_name || 'N/A'}`);
    console.log(`   API Identifier: ${response.data.api_identifier || 'N/A'}`);
    console.log(`   Timezone: ${response.data.timezone || 'N/A'}`);
    
    if (response.data.transactions_limited) {
      console.log(`   ⚠️  Transactions Limited: ${response.data.transactions_balance} remaining`);
    } else {
      console.log('   ✅ Unlimited transactions');
    }

    console.log('\n🎉 Your credentials are working correctly!');
    console.log('\nNext step: Run the bulk sync');
    console.log('   node scripts/initial-response-genius-sync.js');

  } catch (error) {
    console.log('❌ FAILED - Credentials are not valid\n');
    
    if (error.response) {
      console.log('Error Details:');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${JSON.stringify(error.response.data, null, 2)}`);
      
      if (error.response.status === 401 || error.response.status === 403) {
        console.log('\n💡 This means your API ID or API Key is incorrect.');
        console.log('   Please double-check the values from:');
        console.log('   https://control.responsegenius.com/help/api_identifier');
      }
    } else {
      console.log('Error:', error.message);
    }
  }
}

testCredentials();
