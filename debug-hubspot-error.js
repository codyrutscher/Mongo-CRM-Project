require('dotenv').config();
const axios = require('axios');

async function debugHubSpotError() {
  try {
    console.log('🔍 === DEBUGGING HUBSPOT 500 ERROR ===');
    
    const basicProperties = [
      'firstname', 'lastname', 'email', 'phone', 'company',
      'jobtitle', 'website', 'city', 'state', 'country',
      'createdate', 'lastmodifieddate', 'lifecyclestage',
      'do_not_call', 'hs_email_optout'
    ].join(',');

    let after = null;
    let pageCount = 0;
    let totalFetched = 0;
    
    console.log('🚀 Starting to fetch contacts until we hit the 500 error...');
    
    while (pageCount < 100) { // Limit to avoid infinite loop
      try {
        const url = 'https://api.hubapi.com/crm/v3/objects/contacts';
        const params = {
          properties: basicProperties,
          limit: 100
        };

        if (after) {
          params.after = after;
        }

        console.log(`📡 Making request #${pageCount + 1}`);
        console.log(`   URL: ${url}`);
        console.log(`   Params:`, JSON.stringify(params, null, 2));
        console.log(`   After token: ${after || 'null'}`);

        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params,
          timeout: 30000
        });

        if (response.data.results && response.data.results.length > 0) {
          totalFetched += response.data.results.length;
          pageCount++;
          
          console.log(`✅ Success! Fetched ${response.data.results.length} contacts (Total: ${totalFetched})`);
          
          // Check for more pages
          if (response.data.paging && response.data.paging.next) {
            after = response.data.paging.next.after;
            console.log(`   Next after token: ${after}`);
          } else {
            console.log('🏁 Reached end of contacts - no more pages');
            break;
          }

          // Small delay
          await new Promise(resolve => setTimeout(resolve, 100));

        } else {
          console.log('⚠️  Empty response, stopping');
          break;
        }

      } catch (error) {
        console.log('\n🚨 === ERROR DETAILS ===');
        console.log(`Status: ${error.response?.status}`);
        console.log(`Status Text: ${error.response?.statusText}`);
        console.log(`URL that failed: ${error.config?.url}`);
        console.log(`Params that failed:`, JSON.stringify(error.config?.params, null, 2));
        console.log(`After token when error occurred: ${after}`);
        console.log(`Page number when error occurred: ${pageCount + 1}`);
        console.log(`Total contacts fetched before error: ${totalFetched}`);
        
        if (error.response?.data) {
          console.log('Response body:', JSON.stringify(error.response.data, null, 2));
        }
        
        if (error.response?.headers) {
          console.log('Response headers:', JSON.stringify(error.response.headers, null, 2));
        }
        
        console.log('Full error object:', error.message);
        
        break;
      }
    }
    
    console.log(`\n📊 Final stats before error:`);
    console.log(`Pages successfully fetched: ${pageCount}`);
    console.log(`Total contacts fetched: ${totalFetched}`);
    console.log(`Last successful after token: ${after}`);
    
  } catch (error) {
    console.error('💥 Debug script failed:', error);
  }
}

debugHubSpotError();
