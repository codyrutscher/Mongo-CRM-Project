require('dotenv').config();
const axios = require('axios');

async function isolateAPIIssue() {
  console.log('🔍 === ISOLATING HUBSPOT API ISSUE ===');
  
  const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
  const headers = {
    'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  // All the properties we need
  const allProperties = 'firstname,lastname,jobtitle,linkedin_profile_url,email,phone,website,business_category___industry_of_interest,naics_code,numemployees,year_established,office_phone,address,city,state,zip,lead_source,contact_type,hs_email_last_send_date,createdate,lastmodifieddate,lifecyclestage,annualrevenue,industry,account_type,broker,buyer_status,seller_status,currently_own_a_business,legal_organization_type,primary_investor_type,buying_role,motivation_for_buying,dnc_flag,optout,compliance_notes';
  
  console.log('\n🧪 Test 1: Basic API connectivity');
  try {
    const response = await axios.get(baseURL, {
      headers,
      params: { limit: 1 }
    });
    console.log('✅ Basic API works');
  } catch (error) {
    console.log(`❌ Basic API failed: ${error.response?.status}`);
    return;
  }
  
  console.log('\n🧪 Test 2: Small request with all properties');
  try {
    const response = await axios.get(baseURL, {
      headers,
      params: {
        properties: allProperties,
        limit: 1
      }
    });
    console.log('✅ Small request with all properties works');
  } catch (error) {
    console.log(`❌ Small request failed: ${error.response?.status}`);
    console.log('This means one of the properties is invalid');
    return;
  }
  
  console.log('\n🧪 Test 3: Larger batch with all properties');
  try {
    const response = await axios.get(baseURL, {
      headers,
      params: {
        properties: allProperties,
        limit: 10
      }
    });
    console.log('✅ Batch of 10 works');
  } catch (error) {
    console.log(`❌ Batch of 10 failed: ${error.response?.status}`);
  }
  
  console.log('\n🧪 Test 4: Maximum batch size');
  try {
    const response = await axios.get(baseURL, {
      headers,
      params: {
        properties: allProperties,
        limit: 100
      }
    });
    console.log('✅ Batch of 100 works');
  } catch (error) {
    console.log(`❌ Batch of 100 failed: ${error.response?.status}`);
  }
  
  console.log('\n🧪 Test 5: Pagination (this is where it usually fails)');
  try {
    // First get a small batch to get an 'after' token
    const firstResponse = await axios.get(baseURL, {
      headers,
      params: {
        properties: allProperties,
        limit: 5
      }
    });
    
    if (firstResponse.data.paging && firstResponse.data.paging.next) {
      const after = firstResponse.data.paging.next.after;
      console.log(`Got 'after' token: ${after}`);
      
      // Now try the second page
      const secondResponse = await axios.get(baseURL, {
        headers,
        params: {
          properties: allProperties,
          limit: 100,
          after: after
        }
      });
      
      console.log('✅ Pagination works');
    } else {
      console.log('⚠️  No pagination available (not enough contacts?)');
    }
    
  } catch (error) {
    console.log(`❌ Pagination failed: ${error.response?.status}`);
    console.log('🎯 FOUND THE ISSUE: Pagination with all properties fails');
    
    // Let's test pagination with fewer properties
    console.log('\n🧪 Test 6: Pagination with minimal properties');
    try {
      const minProps = 'firstname,lastname,email,dnc_flag';
      
      const firstResponse = await axios.get(baseURL, {
        headers,
        params: {
          properties: minProps,
          limit: 5
        }
      });
      
      if (firstResponse.data.paging && firstResponse.data.paging.next) {
        const after = firstResponse.data.paging.next.after;
        
        const secondResponse = await axios.get(baseURL, {
          headers,
          params: {
            properties: minProps,
            limit: 100,
            after: after
          }
        });
        
        console.log('✅ Pagination works with minimal properties');
        console.log('🎯 SOLUTION: The issue is too many properties in paginated requests');
      }
      
    } catch (error) {
      console.log(`❌ Even minimal pagination failed: ${error.response?.status}`);
    }
  }
  
  console.log('\n🧪 Test 7: Rate limiting check');
  try {
    const response = await axios.get(baseURL, {
      headers,
      params: { limit: 1 }
    });
    
    const rateLimitHeaders = {
      daily: response.headers['x-hubspot-ratelimit-daily-remaining'],
      current: response.headers['x-hubspot-ratelimit-remaining'],
      secondly: response.headers['x-hubspot-ratelimit-secondly-remaining']
    };
    
    console.log('📊 Rate limit status:', rateLimitHeaders);
    
    if (parseInt(rateLimitHeaders.current) < 10) {
      console.log('⚠️  Low rate limit remaining - this might be the issue');
    }
    
  } catch (error) {
    console.log(`❌ Rate limit check failed: ${error.response?.status}`);
  }
  
  console.log('\n🧪 Test 8: Alternative approach - fetch in chunks');
  try {
    // Split properties into smaller chunks
    const propertyChunks = [
      'firstname,lastname,jobtitle,linkedin_profile_url,email,phone',
      'website,business_category___industry_of_interest,naics_code,numemployees',
      'year_established,office_phone,address,city,state,zip',
      'lead_source,contact_type,hs_email_last_send_date,createdate',
      'lastmodifieddate,lifecyclestage,annualrevenue,industry',
      'account_type,broker,buyer_status,seller_status',
      'currently_own_a_business,legal_organization_type',
      'primary_investor_type,buying_role,motivation_for_buying',
      'dnc_flag,optout,compliance_notes'
    ];
    
    console.log(`Testing chunked approach with ${propertyChunks.length} chunks...`);
    
    for (let i = 0; i < propertyChunks.length; i++) {
      const response = await axios.get(baseURL, {
        headers,
        params: {
          properties: propertyChunks[i],
          limit: 10
        }
      });
      console.log(`✅ Chunk ${i + 1}/${propertyChunks.length} works`);
    }
    
    console.log('🎯 ALTERNATIVE SOLUTION: Fetch contacts multiple times with different property sets');
    
  } catch (error) {
    console.log(`❌ Chunked approach failed: ${error.response?.status}`);
  }
  
  console.log('\n📋 DIAGNOSIS COMPLETE');
  console.log('Check the results above to identify the exact issue');
}

isolateAPIIssue();