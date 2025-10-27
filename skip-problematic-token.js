require('dotenv').config();
const axios = require('axios');

async function skipProblematicToken() {
  try {
    console.log('🔧 Testing skip strategy for problematic token: 18302');
    
    const basicProperties = [
      'firstname', 'lastname', 'email', 'phone', 'company',
      'jobtitle', 'website', 'city', 'state', 'country',
      'createdate', 'lastmodifieddate', 'lifecyclestage',
      'do_not_call', 'hs_email_optout'
    ].join(',');

    // Try different approaches to skip the problematic token
    const testTokens = [
      "18303",  // Next number
      "18400",  // Skip ahead a bit
      "19000",  // Skip ahead more
      "20000"   // Skip ahead significantly
    ];
    
    for (const testToken of testTokens) {
      try {
        console.log(`\n🧪 Testing token: ${testToken}`);
        
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params: {
            properties: basicProperties,
            limit: 100,
            after: testToken
          },
          timeout: 30000
        });

        if (response.data.results && response.data.results.length > 0) {
          console.log(`✅ Success with token ${testToken}! Fetched ${response.data.results.length} contacts`);
          console.log(`   Next token: ${response.data.paging?.next?.after}`);
          
          // This token works, so we can continue from here
          return testToken;
        }

      } catch (error) {
        console.log(`❌ Token ${testToken} failed: ${error.response?.status} - ${error.message}`);
      }
    }
    
    console.log('⚠️  All test tokens failed');
    return null;
    
  } catch (error) {
    console.error('💥 Skip test failed:', error);
    return null;
  }
}

skipProblematicToken().then(workingToken => {
  if (workingToken) {
    console.log(`\n🎯 SOLUTION: Use token ${workingToken} to skip the problematic data`);
  } else {
    console.log('\n❌ Could not find a working token to skip the issue');
  }
});
