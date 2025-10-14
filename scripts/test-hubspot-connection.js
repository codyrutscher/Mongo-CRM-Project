const axios = require('axios');

require('dotenv').config();

/**
 * Simple test to verify HubSpot connection and token
 */

async function testHubSpotConnection() {
  console.log('🔍 Testing HubSpot Connection...');
  console.log('================================');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  
  console.log(`Token found: ${hubspotToken ? 'YES' : 'NO'}`);
  if (hubspotToken) {
    console.log(`Token format: ${hubspotToken.substring(0, 20)}...`);
    console.log(`Token length: ${hubspotToken.length} characters`);
  }
  
  if (!hubspotToken) {
    console.log('❌ No HUBSPOT_ACCESS_TOKEN found in .env file');
    return;
  }
  
  try {
    console.log('\n🔗 Testing basic API connection...');
    
    // Test 1: Get account info (simplest test)
    console.log('Test 1: Getting account information...');
    const accountResponse = await axios.get(
      'https://api.hubapi.com/account-info/v3/details',
      {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Account info retrieved successfully!');
    console.log(`Account: ${accountResponse.data.portalId}`);
    console.log(`Hub domain: ${accountResponse.data.domain}`);
    
    // Test 2: Get contacts (basic)
    console.log('\nTest 2: Getting basic contacts...');
    const contactsResponse = await axios.get(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 5,
          properties: 'firstname,lastname,email'
        }
      }
    );
    
    console.log(`✅ Retrieved ${contactsResponse.data.results.length} contacts`);
    contactsResponse.data.results.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.properties.firstname || 'N/A'} ${contact.properties.lastname || 'N/A'} (${contact.properties.email || 'No email'})`);
    });
    
    // Test 3: Check for Cold Lead properties
    console.log('\nTest 3: Checking for Cold Lead properties...');
    const propertiesResponse = await axios.get(
      'https://api.hubapi.com/crm/v3/properties/contacts',
      {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const coldLeadProperties = propertiesResponse.data.results.filter(prop => 
      prop.name.includes('cold_lead') || 
      prop.name.includes('seller_cold_lead') ||
      prop.name.includes('buyer_cold_lead') ||
      prop.name.includes('cre_cold_lead') ||
      prop.name.includes('exf_cold_lead')
    );
    
    console.log(`✅ Found ${coldLeadProperties.length} Cold Lead properties:`);
    coldLeadProperties.forEach(prop => {
      console.log(`  - ${prop.name}: ${prop.label}`);
    });
    
    if (coldLeadProperties.length === 0) {
      console.log('⚠️  No Cold Lead properties found. You may need to create them first.');
      console.log('   Run: node scripts/create-hubspot-cold-lead-properties.js');
    }
    
    // Test 4: Search for contacts with Cold Lead properties
    if (coldLeadProperties.length > 0) {
      console.log('\nTest 4: Searching for contacts with Cold Lead properties...');
      
      const searchResponse = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: coldLeadProperties[0].name,
                  operator: 'EQ',
                  value: 'true'
                }
              ]
            }
          ],
          properties: ['firstname', 'lastname', 'email', ...coldLeadProperties.map(p => p.name)],
          limit: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Found ${searchResponse.data.results.length} contacts with Cold Lead properties`);
      
      if (searchResponse.data.results.length > 0) {
        console.log('\nSample Cold Lead contacts:');
        searchResponse.data.results.slice(0, 3).forEach((contact, index) => {
          const props = contact.properties;
          console.log(`${index + 1}. ${props.firstname || 'N/A'} ${props.lastname || 'N/A'} (${props.email || 'No email'})`);
          coldLeadProperties.forEach(coldProp => {
            if (props[coldProp.name] === 'true') {
              console.log(`   ✅ ${coldProp.label}: true`);
            }
          });
        });
      } else {
        console.log('⚠️  No contacts found with Cold Lead properties set to true');
        console.log('   This might mean:');
        console.log('   1. No contacts have been marked as Cold Leads yet');
        console.log('   2. The property values are different (not "true")');
        console.log('   3. The properties exist but aren\'t being used');
      }
    }
    
    console.log('\n🎉 HubSpot connection test completed successfully!');
    console.log('✅ Token is valid and working');
    console.log('✅ API access confirmed');
    
    return {
      connected: true,
      accountId: accountResponse.data.portalId,
      totalContacts: contactsResponse.data.total,
      coldLeadProperties: coldLeadProperties.length,
      coldLeadContacts: coldLeadProperties.length > 0 ? searchResponse.data.results.length : 0
    };
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔑 Authentication Issues:');
      console.log('1. Token might be expired or invalid');
      console.log('2. Token might not have required scopes');
      console.log('3. Check if the private app is enabled in HubSpot');
      console.log('4. Verify the token format (should start with "pat-")');
    } else if (error.response?.status === 403) {
      console.log('\n🚫 Permission Issues:');
      console.log('1. Token lacks required scopes');
      console.log('2. Add these scopes in HubSpot Developer:');
      console.log('   - crm.objects.contacts.read');
      console.log('   - crm.objects.contacts.write');
      console.log('   - crm.schemas.contacts.read');
    }
    
    return {
      connected: false,
      error: error.response?.data || error.message
    };
  }
}

// Run the test
if (require.main === module) {
  testHubSpotConnection()
    .then((result) => {
      if (result.connected) {
        console.log(`\n📊 Connection Summary:`);
        console.log(`Account ID: ${result.accountId}`);
        console.log(`Total Contacts: ${result.totalContacts}`);
        console.log(`Cold Lead Properties: ${result.coldLeadProperties}`);
        console.log(`Cold Lead Contacts: ${result.coldLeadContacts}`);
      }
      process.exit(result.connected ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testHubSpotConnection };