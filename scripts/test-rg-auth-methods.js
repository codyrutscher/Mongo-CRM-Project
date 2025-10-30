require('dotenv').config();
const axios = require('axios');

const apiId = process.env.RESPONSE_GENIUS_API_ID;
const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
const baseUrl = process.env.RESPONSE_GENIUS_API_URL;

async function testMethod1() {
  console.log('\n1️⃣ Testing: Query Parameters');
  try {
    const response = await axios.get(`${baseUrl}/lists/get_lists`, {
      params: {
        api_id: apiId,
        api_key: apiKey
      }
    });
    console.log('✅ Success!');
    console.log('Type:', typeof response.data);
    return !response.data.includes('<!DOCTYPE html>');
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
}

async function testMethod2() {
  console.log('\n2️⃣ Testing: Headers');
  try {
    const response = await axios.get(`${baseUrl}/lists/get_lists`, {
      headers: {
        'X-API-ID': apiId,
        'X-API-KEY': apiKey
      }
    });
    console.log('✅ Success!');
    console.log('Type:', typeof response.data);
    return !response.data.includes('<!DOCTYPE html>');
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
}

async function testMethod3() {
  console.log('\n3️⃣ Testing: Authorization Header');
  try {
    const response = await axios.get(`${baseUrl}/lists/get_lists`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    console.log('✅ Success!');
    console.log('Type:', typeof response.data);
    return !response.data.includes('<!DOCTYPE html>');
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
}

async function testMethod4() {
  console.log('\n4️⃣ Testing: Basic Auth');
  try {
    const response = await axios.get(`${baseUrl}/lists/get_lists`, {
      auth: {
        username: apiId,
        password: apiKey
      }
    });
    console.log('✅ Success!');
    console.log('Type:', typeof response.data);
    return !response.data.includes('<!DOCTYPE html>');
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
}

async function testMethod5() {
  console.log('\n5️⃣ Testing: POST with body');
  try {
    const response = await axios.post(`${baseUrl}/lists/get_lists`, {
      api_id: apiId,
      api_key: apiKey
    });
    console.log('✅ Success!');
    console.log('Type:', typeof response.data);
    return !response.data.includes('<!DOCTYPE html>');
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
}

async function testAllMethods() {
  console.log('🧪 Testing Different Authentication Methods');
  console.log('═'.repeat(60));
  
  const results = {
    'Query Parameters': await testMethod1(),
    'Headers': await testMethod2(),
    'Authorization Header': await testMethod3(),
    'Basic Auth': await testMethod4(),
    'POST Body': await testMethod5()
  };
  
  console.log('\n' + '═'.repeat(60));
  console.log('RESULTS:');
  console.log('═'.repeat(60));
  
  for (const [method, success] of Object.entries(results)) {
    console.log(`${success ? '✅' : '❌'} ${method}`);
  }
  
  const workingMethod = Object.entries(results).find(([_, success]) => success);
  if (workingMethod) {
    console.log(`\n🎉 Working method found: ${workingMethod[0]}`);
  } else {
    console.log('\n❌ No working authentication method found');
    console.log('The API credentials may still be invalid.');
  }
}

testAllMethods();
