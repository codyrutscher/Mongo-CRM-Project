require('dotenv').config();
const axios = require('axios');

async function proveTokenIssue() {
  try {
    console.log('🔍 === PROVING IF IT\'S A TOKEN ISSUE ===');
    
    const currentToken = process.env.HUBSPOT_ACCESS_TOKEN;
    const problematicAfter = "28052"; // Known failing pagination token
    
    // Test 1: Check token validity and scopes
    console.log('\n1️⃣  Testing current token validity...');
    try {
      const tokenInfo = await axios.get('https://api.hubapi.com/oauth/v1/access-tokens/me', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      console.log('✅ Token validation response:', JSON.stringify(tokenInfo.data, null, 2));
    } catch (error) {
      console.log('❌ Token validation failed:', error.response?.status, error.response?.data);
    }
    
    // Test 2: Try different API endpoints with same token
    console.log('\n2️⃣  Testing different endpoints with same token...');
    
    const endpointTests = [
      { name: 'Companies', url: 'https://api.hubapi.com/crm/v3/objects/companies?limit=10' },
      { name: 'Deals', url: 'https://api.hubapi.com/crm/v3/objects/deals?limit=10' },
      { name: 'Properties', url: 'https://api.hubapi.com/crm/v3/properties/contacts' }
    ];
    
    for (const test of endpointTests) {
      try {
        const response = await axios.get(test.url, {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        console.log(`✅ ${test.name} endpoint: Working (${response.data.results?.length || 'N/A'} items)`);
      } catch (error) {
        console.log(`❌ ${test.name} endpoint: Failed - ${error.response?.status}`);
      }
    }
    
    // Test 3: Try the EXACT same failing request with curl command format
    console.log('\n3️⃣  Testing exact failing request...');
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          properties: 'firstname',
          limit: 100,
          after: problematicAfter
        }
      });
      console.log('✅ UNEXPECTED SUCCESS! The request worked this time');
      console.log(`   Fetched: ${response.data.results?.length} contacts`);
    } catch (error) {
      console.log('❌ Expected failure confirmed');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Error: ${error.response?.data?.message}`);
      console.log(`   Correlation ID: ${error.response?.data?.correlationId}`);
    }
    
    // Test 4: Test with different user-agent and headers
    console.log('\n4️⃣  Testing with different headers...');
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'HubSpot-Testing/1.0',
          'Accept': 'application/json'
        },
        params: {
          properties: 'firstname',
          limit: 100,
          after: problematicAfter
        }
      });
      console.log('✅ Different headers worked!');
    } catch (error) {
      console.log('❌ Different headers also failed');
      console.log(`   Status: ${error.response?.status}`);
    }
    
    // Test 5: Check if it's time-based (wait and retry)
    console.log('\n5️⃣  Testing if it\'s time-based (waiting 30 seconds)...');
    console.log('   Waiting 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          properties: 'firstname',
          limit: 100,
          after: problematicAfter
        }
      });
      console.log('✅ SUCCESS after waiting! This suggests transient issues');
    } catch (error) {
      console.log('❌ Still failing after wait - confirms persistent data corruption');
    }
    
    // Test 6: Generate curl command for manual testing
    console.log('\n6️⃣  Manual testing commands:');
    console.log('\n📋 Copy these commands to test in your terminal:');
    console.log('\n# Test with curl (to rule out Node.js/axios issues):');
    console.log(`curl -H "Authorization: Bearer ${currentToken}" \\`);
    console.log(`  "https://api.hubapi.com/crm/v3/objects/contacts?properties=firstname&limit=100&after=${problematicAfter}"`);
    
    console.log('\n# Test token info:');
    console.log(`curl -H "Authorization: Bearer ${currentToken}" \\`);
    console.log(`  "https://api.hubapi.com/oauth/v1/access-tokens/me"`);
    
    console.log('\n💡 If curl also fails with 500 error, it\'s definitely data corruption, not a Node.js issue');
    
  } catch (error) {
    console.error('💥 Token issue test failed:', error);
  }
}

proveTokenIssue();
