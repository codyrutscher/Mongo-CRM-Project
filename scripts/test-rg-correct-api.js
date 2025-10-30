require('dotenv').config();
const axios = require('axios');

const apiId = process.env.RESPONSE_GENIUS_API_ID;
const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
const baseUrl = process.env.RESPONSE_GENIUS_API_URL;

async function testGetLists() {
  console.log('🧪 Testing Response Genius API - Get Lists\n');
  console.log(`API ID: ${apiId?.substring(0, 20)}...`);
  console.log(`Base URL: ${baseUrl}\n`);

  try {
    // According to Response Genius API docs, the format should be:
    // GET /api?api_id=XXX&api_key=YYY&action=lists_get
    
    console.log('Method 1: /api with action parameter');
    const response1 = await axios.get(`${baseUrl}/api`, {
      params: {
        api_id: apiId,
        api_key: apiKey,
        action: 'lists_get'
      }
    });
    
    console.log('✅ Success!');
    console.log('Response type:', typeof response1.data);
    
    if (typeof response1.data === 'string' && response1.data.includes('<!DOCTYPE html>')) {
      console.log('❌ Still getting HTML');
    } else {
      console.log('✅ Got JSON response!');
      console.log('Response:', JSON.stringify(response1.data, null, 2).substring(0, 500));
      return true;
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      if (typeof error.response.data === 'string') {
        console.error('Response preview:', error.response.data.substring(0, 200));
      }
    }
  }

  try {
    console.log('\nMethod 2: Direct /lists endpoint');
    const response2 = await axios.get(`${baseUrl}/lists`, {
      params: {
        api_id: apiId,
        api_key: apiKey
      }
    });
    
    console.log('✅ Success!');
    console.log('Response type:', typeof response2.data);
    
    if (typeof response2.data === 'string' && response2.data.includes('<!DOCTYPE html>')) {
      console.log('❌ Still getting HTML');
    } else {
      console.log('✅ Got JSON response!');
      console.log('Response:', JSON.stringify(response2.data, null, 2).substring(0, 500));
      return true;
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
  }

  try {
    console.log('\nMethod 3: /api/lists endpoint');
    const response3 = await axios.get(`${baseUrl}/api/lists`, {
      params: {
        api_id: apiId,
        api_key: apiKey
      }
    });
    
    console.log('✅ Success!');
    console.log('Response type:', typeof response3.data);
    
    if (typeof response3.data === 'string' && response3.data.includes('<!DOCTYPE html>')) {
      console.log('❌ Still getting HTML');
    } else {
      console.log('✅ Got JSON response!');
      console.log('Response:', JSON.stringify(response3.data, null, 2).substring(0, 500));
      return true;
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
  }

  return false;
}

async function testImportContact() {
  console.log('\n\n🧪 Testing Response Genius API - Import Contact\n');

  const testContact = {
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User'
  };

  const listId = process.env.RESPONSE_GENIUS_DNC_SELLER_LIST_ID;

  try {
    console.log('Method 1: /api with action=list_import_optin');
    const response1 = await axios.post(`${baseUrl}/api`, null, {
      params: {
        api_id: apiId,
        api_key: apiKey,
        action: 'list_import_optin',
        list_api_identifier: listId,
        email: testContact.email,
        first_name: testContact.first_name,
        last_name: testContact.last_name
      }
    });
    
    console.log('✅ Success!');
    console.log('Response type:', typeof response1.data);
    
    if (typeof response1.data === 'string' && response1.data.includes('<!DOCTYPE html>')) {
      console.log('❌ Still getting HTML');
    } else {
      console.log('✅ Got JSON response!');
      console.log('Response:', JSON.stringify(response1.data, null, 2));
      return true;
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response?.data) {
      console.error('Response:', typeof error.response.data === 'string' ? 
        error.response.data.substring(0, 200) : error.response.data);
    }
  }

  try {
    console.log('\nMethod 2: POST to /api with JSON body');
    const response2 = await axios.post(`${baseUrl}/api`, {
      api_id: apiId,
      api_key: apiKey,
      action: 'list_import_optin',
      list_api_identifier: listId,
      contacts: [testContact]
    });
    
    console.log('✅ Success!');
    console.log('Response type:', typeof response2.data);
    
    if (typeof response2.data === 'string' && response2.data.includes('<!DOCTYPE html>')) {
      console.log('❌ Still getting HTML');
    } else {
      console.log('✅ Got JSON response!');
      console.log('Response:', JSON.stringify(response2.data, null, 2));
      return true;
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
  }

  return false;
}

async function main() {
  const listsWork = await testGetLists();
  const importWorks = await testImportContact();
  
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Get Lists: ${listsWork ? '✅ Working' : '❌ Not Working'}`);
  console.log(`Import Contact: ${importWorks ? '✅ Working' : '❌ Not Working'}`);
  
  if (!listsWork && !importWorks) {
    console.log('\n❌ API credentials appear to be invalid');
    console.log('Please verify at: https://control.responsegenius.com/help/api_identifier');
  }
}

main();
