require('dotenv').config();
const axios = require('axios');

async function investigate500Error() {
  try {
    console.log('🔍 === INVESTIGATING 500 ERROR ROOT CAUSE ===');
    
    // Test 1: Check token permissions with a simple API call
    console.log('\n1️⃣  Testing token permissions...');
    try {
      const response = await axios.get('https://api.hubapi.com/oauth/v1/access-tokens/me', {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`
        }
      });
      
      console.log('✅ Token is valid');
      console.log('🔑 Token info:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Token issue:', error.response?.status, error.response?.data);
    }
    
    // Test 2: Check basic contacts endpoint without any after token
    console.log('\n2️⃣  Testing basic contacts endpoint...');
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          properties: 'firstname,lastname,email',
          limit: 10
        }
      });
      
      console.log('✅ Basic endpoint works');
      console.log('📊 Returned:', response.data.results?.length, 'contacts');
    } catch (error) {
      console.log('❌ Basic endpoint failed:', error.response?.status, error.response?.data);
    }
    
    // Test 3: Check rate limits
    console.log('\n3️⃣  Checking current rate limit status...');
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          properties: 'firstname',
          limit: 1
        }
      });
      
      const headers = response.headers;
      console.log('📊 Rate limit headers:');
      console.log('   Daily limit:', headers['x-hubspot-ratelimit-daily']);
      console.log('   Daily remaining:', headers['x-hubspot-ratelimit-daily-remaining']);
      console.log('   Interval limit:', headers['x-hubspot-ratelimit-max']);
      console.log('   Interval remaining:', headers['x-hubspot-ratelimit-remaining']);
      
    } catch (error) {
      console.log('❌ Rate limit check failed:', error.response?.status);
    }
    
    // Test 4: Test the exact scenario that's failing
    console.log('\n4️⃣  Testing scenario that causes 500 error...');
    
    // First get successful pagination to find where we are
    let after = null;
    let pageCount = 0;
    
    try {
      while (pageCount < 30) { // Test first 30 pages to find the problematic point
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params: {
            properties: 'firstname,lastname,email,phone,company,jobtitle,website,city,state,country,createdate,lastmodifieddate,lifecyclestage,do_not_call,hs_email_optout',
            limit: 100,
            ...(after && { after })
          }
        });
        
        pageCount++;
        console.log(`   ✅ Page ${pageCount}: Success (after: ${after})`);
        
        if (response.data.paging?.next?.after) {
          after = response.data.paging.next.after;
        } else {
          console.log('   🏁 Reached end of contacts');
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.log(`   ❌ FAILED at page ${pageCount + 1} with after token: ${after}`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Error: ${JSON.stringify(error.response?.data, null, 2)}`);
      console.log(`   Headers:`, JSON.stringify(error.response?.headers, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Investigation failed:', error);
  }
}

investigate500Error();
