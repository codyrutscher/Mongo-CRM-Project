require('dotenv').config();
const axios = require('axios');

async function testBatchCombinations() {
  console.log('🧪 === TESTING BATCH COMBINATIONS ===');
  console.log('Finding exactly when and why the 500 error occurs');
  
  const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
  const headers = {
    'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  const allProperties = 'firstname,lastname,jobtitle,linkedin_profile_url,email,phone,company,website,business_category___industry_of_interest,naics_code,numemployees,year_established,office_phone,address,city,state,zip,lead_source,contact_type,hs_email_last_send_date,createdate,lastmodifieddate,lifecyclestage,annualrevenue,industry,account_type,broker,buyer_status,seller_status,interested_in,currently_own_a_business,legal_organization_type,primary_investor_type,buying_role,motivation_for_buying,do_not_call,dnc_flag,optout,compliance_notes';
  
  console.log('\n🔍 Testing different scenarios to isolate the issue...');
  
  // Test 1: Start from beginning with batch 100
  console.log('\n📊 Test 1: Batch 100 from start');
  try {
    const response = await axios.get(baseURL, {
      headers,
      params: {
        properties: allProperties,
        limit: 100
      }
    });
    console.log(`✅ Success: ${response.data.results.length} contacts`);
    
    // Test 2: Try the next batch (this is where it usually fails)
    if (response.data.paging && response.data.paging.next) {
      const after = response.data.paging.next.after;
      console.log(`\n📊 Test 2: Batch 100 from after: ${after}`);
      
      try {
        const response2 = await axios.get(baseURL, {
          headers,
          params: {
            properties: allProperties,
            limit: 100,
            after: after
          }
        });
        console.log(`✅ Success: ${response2.data.results.length} contacts`);
        
        // Continue testing more batches to find where it breaks
        let currentAfter = response2.data.paging?.next?.after;
        let batchNum = 3;
        
        while (currentAfter && batchNum <= 20) {
          console.log(`\n📊 Test ${batchNum}: Batch 100 from after: ${currentAfter}`);
          
          try {
            const responseN = await axios.get(baseURL, {
              headers,
              params: {
                properties: allProperties,
                limit: 100,
                after: currentAfter
              }
            });
            console.log(`✅ Success: ${responseN.data.results.length} contacts`);
            currentAfter = responseN.data.paging?.next?.after;
            batchNum++;
            
            // Small delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            console.log(`❌ FAILED at batch ${batchNum}, after: ${currentAfter}`);
            console.log(`   Status: ${error.response?.status}`);
            
            // Now we know exactly where it fails - let's analyze this batch
            await analyzeProblemBatch(currentAfter, headers, allProperties);
            break;
          }
        }
        
      } catch (error) {
        console.log(`❌ FAILED at second batch, after: ${after}`);
        console.log(`   Status: ${error.response?.status}`);
        
        await analyzeProblemBatch(after, headers, allProperties);
      }
    }
    
  } catch (error) {
    console.log(`❌ Even first batch failed: ${error.response?.status}`);
  }
}

async function analyzeProblemBatch(after, headers, allProperties) {
  console.log(`\n🔬 ANALYZING PROBLEM BATCH (after: ${after}):`);
  
  const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
  
  // Test with smaller batch sizes to see what works
  const batchSizes = [50, 25, 10];
  
  for (const batchSize of batchSizes) {
    try {
      console.log(`   Testing batch size ${batchSize}...`);
      
      const response = await axios.get(baseURL, {
        headers,
        params: {
          properties: allProperties,
          limit: batchSize,
          after: after
        }
      });
      
      console.log(`   ✅ Batch size ${batchSize} works: ${response.data.results.length} contacts`);
      
      if (batchSize === 10) {
        // Show the contacts in this working batch
        console.log(`\n   📋 Contacts in working batch of ${batchSize}:`);
        response.data.results.forEach((contact, i) => {
          console.log(`      ${i + 1}. ID: ${contact.id} - ${contact.properties.firstname || '[no name]'} ${contact.properties.lastname || ''} (${contact.properties.email || '[no email]'})`);
          
          // Check for suspicious data
          const company = contact.properties.company;
          const interested = contact.properties.interested_in;
          const dnc = contact.properties.do_not_call;
          
          if (company && (company.length > 200 || /[\r\n]/.test(company))) {
            console.log(`         ⚠️  Suspicious company: "${company.substring(0, 50)}..."`);
          }
          if (interested && (interested.length > 200 || /[\r\n]/.test(interested))) {
            console.log(`         ⚠️  Suspicious interested_in: "${interested.substring(0, 50)}..."`);
          }
          if (dnc && typeof dnc !== 'boolean' && dnc !== 'true' && dnc !== 'false') {
            console.log(`         ⚠️  Suspicious do_not_call: "${dnc}"`);
          }
        });
        
        // Now try to get the next 10 contacts (which might contain the problematic one)
        const lastContact = response.data.results[response.data.results.length - 1];
        console.log(`\n   🎯 Testing next batch after ID: ${lastContact.id}`);
        
        try {
          const nextResponse = await axios.get(baseURL, {
            headers,
            params: {
              properties: allProperties,
              limit: 10,
              after: lastContact.id
            }
          });
          
          console.log(`   ✅ Next batch also works: ${nextResponse.data.results.length} contacts`);
          
        } catch (nextError) {
          console.log(`   ❌ Next batch fails: ${nextError.response?.status}`);
          console.log(`   🎯 The problematic contact is likely right after ID: ${lastContact.id}`);
          
          // Try to get individual contacts
          await findExactProblematicContact(lastContact.id, headers);
        }
      }
      
      break; // Found a working batch size, no need to test smaller ones
      
    } catch (error) {
      console.log(`   ❌ Batch size ${batchSize} failed: ${error.response?.status}`);
    }
  }
}

async function findExactProblematicContact(afterId, headers) {
  console.log(`\n🎯 FINDING EXACT PROBLEMATIC CONTACT after ID: ${afterId}`);
  
  // Try to get contacts one by one
  for (let i = 1; i <= 10; i++) {
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers,
        params: {
          properties: 'firstname,lastname,email,company,interested_in,do_not_call',
          limit: 1,
          after: afterId
        }
      });
      
      if (response.data.results && response.data.results.length > 0) {
        const contact = response.data.results[0];
        console.log(`   Contact ${i}: ID ${contact.id} - ${contact.properties.firstname || '[no name]'} ${contact.properties.lastname || ''}`);
        
        // Check this specific contact with all properties
        try {
          await axios.get(`https://api.hubapi.com/crm/v3/objects/contacts/${contact.id}`, {
            headers,
            params: {
              properties: 'firstname,lastname,jobtitle,linkedin_profile_url,email,phone,company,website,business_category___industry_of_interest,naics_code,numemployees,year_established,office_phone,address,city,state,zip,lead_source,contact_type,hs_email_last_send_date,createdate,lastmodifieddate,lifecyclestage,annualrevenue,industry,account_type,broker,buyer_status,seller_status,interested_in,currently_own_a_business,legal_organization_type,primary_investor_type,buying_role,motivation_for_buying,do_not_call,dnc_flag,optout,compliance_notes'
            }
          });
          
          console.log(`      ✅ All properties work for this contact`);
          
        } catch (error) {
          console.log(`      ❌ ALL PROPERTIES FAIL for this contact: ${error.response?.status}`);
          console.log(`\n🚨 FOUND THE PROBLEMATIC CONTACT:`);
          console.log(`   ID: ${contact.id}`);
          console.log(`   Name: ${contact.properties.firstname || '[no name]'} ${contact.properties.lastname || ''}`);
          console.log(`   Email: ${contact.properties.email || '[no email]'}`);
          console.log(`\n🔍 HubSpot URL:`);
          console.log(`   https://app.hubspot.com/contacts/YOUR_PORTAL_ID/contact/${contact.id}`);
          
          return;
        }
        
        afterId = contact.id;
      }
      
    } catch (error) {
      console.log(`   ❌ Error getting contact ${i}: ${error.response?.status}`);
      break;
    }
  }
}

testBatchCombinations();