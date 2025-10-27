require('dotenv').config();
const axios = require('axios');

const apiId = process.env.RESPONSE_GENIUS_API_ID;
const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
const baseUrl = process.env.RESPONSE_GENIUS_API_URL;

const lists = [
  { id: process.env.RESPONSE_GENIUS_SELLER_LIST_ID, name: 'DNC - Seller outreach' },
  { id: process.env.RESPONSE_GENIUS_BUYER_LIST_ID, name: 'DNC - Buyer outreach' },
  { id: process.env.RESPONSE_GENIUS_CRE_LIST_ID, name: 'DNC - CRE outreach' },
  { id: process.env.RESPONSE_GENIUS_EXF_LIST_ID, name: 'DNC - EXF outreach' }
];

async function makeRequest(endpoint, method = 'GET', data = null) {
  const url = `${baseUrl}${endpoint}`;
  const config = {
    method,
    url,
    params: { api_id: apiId, api_key: apiKey },
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (data) {
    if (method === 'GET') {
      config.params = { ...config.params, ...data };
    } else {
      config.data = data;
    }
  }
  
  const response = await axios(config);
  return response.data;
}

async function searchList(listId) {
  try {
    const result = await makeRequest('/lists/search', 'GET', { list_api_identifier: listId });
    return result;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function createList(listId, listName) {
  try {
    const result = await makeRequest('/lists/add_or_update', 'GET', {
      list_api_identifier: listId,
      list_description: listName
    });
    return result;
  } catch (error) {
    console.error(`Error creating list ${listId}:`, error.message);
    if (error.response?.data) {
      console.error(`  Response:`, error.response.data);
    }
    return null;
  }
}

async function main() {
  console.log('Verifying Response Genius DNC Lists\n');
  console.log('='.repeat(60));
  
  console.log('\nAPI Configuration:');
  console.log('  URL:', baseUrl);
  console.log('  API ID:', apiId ? '✓ Set' : '✗ Missing');
  console.log('  API Key:', apiKey ? '✓ Set' : '✗ Missing');
  
  console.log('\n' + '='.repeat(60));
  console.log('Checking Lists:');
  console.log('='.repeat(60));
  
  for (const list of lists) {
    console.log(`\n${list.name}`);
    console.log(`  List ID: ${list.id}`);
    
    try {
      const result = await searchList(list.id);
      
      if (result) {
        console.log(`  Status: ✓ Exists`);
        if (result.total_contacts !== undefined) {
          console.log(`  Contacts: ${result.total_contacts}`);
        }
      } else {
        console.log(`  Status: ✗ Not found`);
        console.log(`  Creating list...`);
        
        const created = await createList(list.id, list.name);
        if (created) {
          console.log(`  Status: ✓ Created successfully`);
        } else {
          console.log(`  Status: ✗ Failed to create`);
        }
      }
    } catch (error) {
      console.log(`  Status: ✗ Error - ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Verification Complete!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('  1. If lists were created, verify them in Response Genius dashboard');
  console.log('  2. Run: node scripts/test-dnc-list-sync.js');
  console.log('  3. Run: node scripts/sync-dnc-lists-to-response-genius.js');
}

main().catch(console.error);
