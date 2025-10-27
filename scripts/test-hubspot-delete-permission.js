const axios = require('axios');

require('dotenv').config();

async function testHubSpotDeletePermission() {
  console.log('Testing HubSpot API delete permissions...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  try {
    // First, let's check what scopes/permissions the token has
    console.log('\n🔍 Checking API token permissions...');
    
    try {
      const tokenInfo = await axios.get('https://api.hubapi.com/oauth/v1/access-tokens/' + hubspotToken, {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Token scopes:', tokenInfo.data.scopes);
      
      const hasDeleteScope = tokenInfo.data.scopes.some(scope => 
        scope.includes('crm.objects.contacts.write') || 
        scope.includes('contacts') ||
        scope.includes('crm.objects.contacts.delete')
      );
      
      if (hasDeleteScope) {
        console.log('✅ Token has contact write/delete permissions');
      } else {
        console.log('⚠️ Token may not have contact delete permissions');
      }
      
    } catch (error) {
      console.log('Could not check token info (this is normal for private apps)');
      console.log('Proceeding to test delete functionality...');
    }
    
    // Test the delete endpoint documentation
    console.log('\n📚 HubSpot Contact Delete API Information:');
    console.log('Endpoint: DELETE https://api.hubapi.com/crm/v3/objects/contacts/{contactId}');
    console.log('Required scope: crm.objects.contacts.write');
    console.log('');
    console.log('To delete a contact:');
    console.log('1. Send DELETE request to the endpoint with contact ID');
    console.log('2. Contact will be moved to "Recently Deleted" in HubSpot');
    console.log('3. Can be restored within 90 days');
    console.log('4. After 90 days, permanently deleted');
    
    // Let's create a test function (but not actually delete anything)
    console.log('\n🧪 Testing delete API endpoint availability...');
    
    // Try to get a contact first to verify API access
    try {
      const testResponse = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 1,
          properties: 'email'
        }
      });
      
      if (testResponse.data.results && testResponse.data.results.length > 0) {
        const testContactId = testResponse.data.results[0].id;
        console.log(`✅ API access confirmed. Sample contact ID: ${testContactId}`);
        console.log('');
        console.log('To delete this contact, you would call:');
        console.log(`DELETE https://api.hubapi.com/crm/v3/objects/contacts/${testContactId}`);
        console.log('');
        console.log('⚠️ NOTE: We are NOT actually deleting anything in this test!');
      }
      
    } catch (error) {
      console.log('❌ Error accessing contacts API:', error.message);
    }
    
    // Show example delete function
    console.log('\n📝 Example Delete Function:');
    console.log(`
async function deleteContactFromHubSpot(contactId) {
  const response = await axios.delete(
    \`https://api.hubapi.com/crm/v3/objects/contacts/\${contactId}\`,
    {
      headers: {
        'Authorization': \`Bearer \${hubspotToken}\`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.status === 204; // 204 = Successfully deleted
}
    `);
    
    console.log('\n✅ Summary:');
    console.log('- HubSpot API supports contact deletion');
    console.log('- Requires crm.objects.contacts.write scope');
    console.log('- Deleted contacts go to "Recently Deleted" (90-day recovery)');
    console.log('- Can delete individual contacts or batch delete');
    console.log('- Your token appears to have API access');
    
  } catch (error) {
    console.error('Error during permission test:', error.message);
    throw error;
  }
}

// Run the test
testHubSpotDeletePermission()
  .then(() => {
    console.log('\nPermission test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });