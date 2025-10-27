require('dotenv').config();
const axios = require('axios');

async function testExactFailingCombo() {
  try {
    console.log('🎯 === TESTING EXACT FAILING COMBINATION FROM ORIGINAL SYNC ===');
    
    // This is the exact property list from the simple-hubspot-sync.js that was failing
    const originalProperties = "firstname,lastname,email,phone,company,jobtitle,website,city,state,country,createdate,lastmodifieddate,lifecyclestage,do_not_call,hs_email_optout";
    
    const problematicToken = "18302";
    
    console.log(`🧪 Testing EXACT original property list that was failing:`);
    console.log(`Properties: ${originalProperties}`);
    console.log(`Token: ${problematicToken}`);
    console.log(`Batch size: 100 (same as original)`);
    
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          properties: originalProperties,
          limit: 100,
          after: problematicToken
        },
        timeout: 30000
      });

      console.log(`✅ SUCCESS! The exact failing combination now works!`);
      console.log(`   Fetched ${response.data.results.length} contacts`);
      console.log(`   Next token: ${response.data.paging?.next?.after}`);
      
      // Let's continue from this point and see if it fails later
      console.log(`\n🔄 Testing continuation from next token...`);
      
      let currentToken = response.data.paging?.next?.after;
      let pageCount = 1;
      
      while (currentToken && pageCount < 10) {
        try {
          const nextResponse = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
            headers: {
              'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            params: {
              properties: originalProperties,
              limit: 100,
              after: currentToken
            },
            timeout: 30000
          });

          pageCount++;
          console.log(`✅ Page ${pageCount}: Success - ${nextResponse.data.results.length} contacts (token: ${currentToken})`);
          
          currentToken = nextResponse.data.paging?.next?.after;
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.log(`❌ Page ${pageCount + 1} FAILED at token ${currentToken}`);
          console.log(`   Status: ${error.response?.status}`);
          console.log(`   Error: ${error.response?.data?.message}`);
          console.log(`   Correlation ID: ${error.response?.data?.correlationId}`);
          break;
        }
      }
      
    } catch (error) {
      console.log(`❌ FAILED: ${error.response?.status} - ${error.message}`);
      console.log(`   Error details: ${JSON.stringify(error.response?.data, null, 2)}`);
      console.log(`   Correlation ID: ${error.response?.data?.correlationId}`);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testExactFailingCombo();
