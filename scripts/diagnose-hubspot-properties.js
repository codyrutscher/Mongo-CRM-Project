require('dotenv').config();
const axios = require('axios');

async function diagnoseHubSpotProperties() {
  console.log('🔍 === DIAGNOSING HUBSPOT PROPERTIES ===');
  
  const allProperties = [
    // NAICS Standard Fields
    'firstname', 'lastname', 'jobtitle', 'linkedin_profile_url', 'email', 'phone',
    'company', 'website', 'business_category___industry_of_interest', 'naics_code',
    'numemployees', 'year_established', 'office_phone', 'address', 'city', 'state', 'zip',
    'lead_source', 'contact_type', 'hs_email_last_send_date',
    
    // System fields
    'createdate', 'lastmodifieddate', 'lifecyclestage',
    
    // Additional business fields
    'annualrevenue', 'industry', 'account_type', 'broker',
    'buyer_status', 'seller_status', 'interested_in',
    'currently_own_a_business', 'legal_organization_type',
    'primary_investor_type', 'buying_role', 'motivation_for_buying',
    
    // DNC and compliance
    'do_not_call', 'dnc_flag', 'optout', 'compliance_notes'
  ];
  
  const workingProperties = [];
  const problematicProperties = [];
  
  console.log(`Testing ${allProperties.length} properties individually...`);
  
  for (const property of allProperties) {
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          properties: property,
          limit: 1
        }
      });
      
      if (response.status === 200) {
        workingProperties.push(property);
        console.log(`✅ ${property}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      problematicProperties.push({
        property: property,
        status: error.response?.status,
        message: error.message
      });
      console.log(`❌ ${property} - Status: ${error.response?.status}`);
    }
  }
  
  console.log(`\n📊 DIAGNOSIS RESULTS:`);
  console.log(`✅ Working properties: ${workingProperties.length}`);
  console.log(`❌ Problematic properties: ${problematicProperties.length}`);
  
  if (problematicProperties.length > 0) {
    console.log(`\n🚨 PROBLEMATIC PROPERTIES:`);
    problematicProperties.forEach(prop => {
      console.log(`   - ${prop.property} (Status: ${prop.status})`);
    });
  }
  
  console.log(`\n✅ WORKING PROPERTIES LIST:`);
  console.log(workingProperties.join(','));
  
  // Test the working properties together
  if (workingProperties.length > 0) {
    console.log(`\n🧪 Testing all working properties together...`);
    
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          properties: workingProperties.join(','),
          limit: 5
        }
      });
      
      console.log(`✅ SUCCESS! All working properties can be used together`);
      console.log(`📊 Returned ${response.data.results?.length || 0} contacts`);
      
    } catch (error) {
      console.log(`❌ Error with combined properties: ${error.response?.status} - ${error.message}`);
    }
  }
}

diagnoseHubSpotProperties();