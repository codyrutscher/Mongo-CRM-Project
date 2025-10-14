require('dotenv').config();
const axios = require('axios');

async function identifyExactProblematicContact() {
  console.log('🎯 === IDENTIFYING EXACT PROBLEMATIC CONTACT ===');
  
  const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
  const headers = {
    'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  // All properties including the problematic ones
  const allProperties = 'firstname,lastname,jobtitle,linkedin_profile_url,email,phone,company,website,business_category___industry_of_interest,naics_code,numemployees,year_established,office_phone,address,city,state,zip,lead_source,contact_type,hs_email_last_send_date,createdate,lastmodifieddate,lifecyclestage,annualrevenue,industry,account_type,broker,buyer_status,seller_status,interested_in,currently_own_a_business,legal_organization_type,primary_investor_type,buying_role,motivation_for_buying,do_not_call,dnc_flag,optout,compliance_notes';
  
  console.log('🔍 Finding the exact contact that causes the 500 error...');
  
  // We know from earlier that the problem starts around after token 5552
  let after = '5552';
  let found = false;
  
  // Try to narrow down to the exact problematic contact
  const batchSizes = [50, 25, 10, 5, 1];
  
  for (const batchSize of batchSizes) {
    console.log(`\n🧪 Testing batch size ${batchSize} starting from after: ${after}`);
    
    try {
      const response = await axios.get(baseURL, {
        headers,
        params: {
          properties: allProperties,
          limit: batchSize,
          after: after
        }
      });
      
      if (response.data.results && response.data.results.length > 0) {
        console.log(`✅ Batch size ${batchSize} works - ${response.data.results.length} contacts returned`);
        
        if (batchSize === 1) {
          // We found the exact contact that works at this position
          const contact = response.data.results[0];
          console.log(`\n📋 CONTACT AT POSITION ${after}:`);
          console.log(`   ID: ${contact.id}`);
          console.log(`   Name: ${contact.properties.firstname || '[no firstname]'} ${contact.properties.lastname || '[no lastname]'}`);
          console.log(`   Email: ${contact.properties.email || '[no email]'}`);
          console.log(`   Company: ${contact.properties.company || '[no company]'}`);
          console.log(`   Do Not Call: ${contact.properties.do_not_call || '[not set]'}`);
          console.log(`   Interested In: ${contact.properties.interested_in || '[not set]'}`);
          
          // Now try the NEXT contact (which should be the problematic one)
          console.log(`\n🎯 Testing the NEXT contact (ID: ${contact.id}) which should be problematic...`);
          
          try {
            const nextResponse = await axios.get(baseURL, {
              headers,
              params: {
                properties: allProperties,
                limit: 1,
                after: contact.id
              }
            });
            
            if (nextResponse.data.results && nextResponse.data.results.length > 0) {
              const nextContact = nextResponse.data.results[0];
              console.log(`❌ UNEXPECTED: Next contact works too!`);
              console.log(`   Next ID: ${nextContact.id}`);
              console.log(`   Next Name: ${nextContact.properties.firstname || '[no firstname]'} ${nextContact.properties.lastname || '[no lastname]'}`);
            }
            
          } catch (nextError) {
            const nextContact = await getContactWithMinimalProperties(contact.id, headers);
            
            if (nextContact) {
              console.log(`\n🚨 FOUND PROBLEMATIC CONTACT:`);
              console.log(`   ID: ${nextContact.id}`);
              console.log(`   Name: ${nextContact.properties.firstname || '[no firstname]'} ${nextContact.properties.lastname || '[no lastname]'}`);
              console.log(`   Email: ${nextContact.properties.email || '[no email]'}`);
              
              console.log(`\n🔍 HubSpot URL to view this contact:`);
              console.log(`   https://app.hubspot.com/contacts/YOUR_PORTAL_ID/contact/${nextContact.id}`);
              
              // Try to get more details about what's wrong
              await analyzeProblematicContact(nextContact.id, headers);
              found = true;
            }
          }
        }
        
        if (found) break;
        
      } else {
        console.log(`⚠️  Empty response for batch size ${batchSize}`);
      }
      
    } catch (error) {
      console.log(`❌ Batch size ${batchSize} failed: ${error.response?.status}`);
      
      if (batchSize === 1) {
        console.log(`\n🚨 Even single contact fails at position ${after}`);
        
        // Try to get the contact with minimal properties to identify it
        const problematicContact = await getContactWithMinimalProperties(after, headers);
        
        if (problematicContact) {
          console.log(`\n🚨 PROBLEMATIC CONTACT IDENTIFIED:`);
          console.log(`   ID: ${problematicContact.id}`);
          console.log(`   Name: ${problematicContact.properties.firstname || '[no firstname]'} ${problematicContact.properties.lastname || '[no lastname]'}`);
          console.log(`   Email: ${problematicContact.properties.email || '[no email]'}`);
          
          console.log(`\n🔍 HubSpot URL to view this contact:`);
          console.log(`   https://app.hubspot.com/contacts/YOUR_PORTAL_ID/contact/${problematicContact.id}`);
          
          await analyzeProblematicContact(problematicContact.id, headers);
          found = true;
        }
      }
    }
    
    if (found) break;
  }
  
  if (!found) {
    console.log('\n❌ Could not isolate the exact problematic contact');
    console.log('💡 The issue might be intermittent or related to the combination of properties');
  }
}

async function getContactWithMinimalProperties(after, headers) {
  const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
  
  try {
    const response = await axios.get(baseURL, {
      headers,
      params: {
        properties: 'firstname,lastname,email',
        limit: 1,
        ...(after && { after })
      }
    });
    
    return response.data.results && response.data.results.length > 0 ? response.data.results[0] : null;
    
  } catch (error) {
    console.log(`❌ Even minimal properties failed: ${error.response?.status}`);
    return null;
  }
}

async function analyzeProblematicContact(contactId, headers) {
  console.log(`\n🔬 ANALYZING PROBLEMATIC CONTACT ${contactId}:`);
  
  // Test each problematic property individually
  const problematicProperties = ['company', 'interested_in', 'do_not_call'];
  
  for (const prop of problematicProperties) {
    try {
      const response = await axios.get(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
        headers,
        params: {
          properties: prop
        }
      });
      
      const value = response.data.properties[prop];
      console.log(`   ✅ ${prop}: "${value}" (${typeof value}) - Length: ${value ? value.length : 0}`);
      
      // Check for problematic characters
      if (value && typeof value === 'string') {
        const hasSpecialChars = /[^\x20-\x7E]/.test(value);
        const hasNewlines = /[\r\n]/.test(value);
        const isVeryLong = value.length > 1000;
        
        if (hasSpecialChars) console.log(`      ⚠️  Contains special characters`);
        if (hasNewlines) console.log(`      ⚠️  Contains newlines`);
        if (isVeryLong) console.log(`      ⚠️  Very long value (${value.length} chars)`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${prop}: FAILS - ${error.response?.status}`);
    }
  }
  
  // Try getting all properties except the problematic ones
  const safeProperties = 'firstname,lastname,email,phone,jobtitle,website,city,state,zip,createdate,lastmodifieddate,lifecyclestage,dnc_flag,optout';
  
  try {
    const response = await axios.get(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
      headers,
      params: {
        properties: safeProperties
      }
    });
    
    console.log(`   ✅ Safe properties work fine`);
    
  } catch (error) {
    console.log(`   ❌ Even safe properties fail: ${error.response?.status}`);
  }
}

identifyExactProblematicContact();