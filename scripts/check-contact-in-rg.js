require('dotenv').config();
const axios = require('axios');

const apiId = process.env.RESPONSE_GENIUS_API_ID;
const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
const baseUrl = process.env.RESPONSE_GENIUS_API_URL || 'https://control.responsegenius.com/rest';

async function checkContact(email, listId, listName) {
  try {
    console.log(`\n🔍 Checking: ${listName}`);
    console.log(`   List ID: ${listId}`);
    
    // Try to get the contact's status on this list
    const response = await axios.get(`${baseUrl}/lists/subscribe_user`, {
      params: {
        api_id: apiId,
        api_key: apiKey,
        list_api_identifier: listId,
        email_address: email
      }
    });
    
    console.log(`   ✅ Contact is ON the list`);
    if (response.data) {
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    }
    return true;
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`   ❌ Contact NOT found on this list`);
    } else {
      console.log(`   ⚠️  Error: ${error.response?.data?.reason || error.message}`);
    }
    return false;
  }
}

async function checkAllLists(email) {
  try {
    console.log('🔍 Checking Contact in Response Genius Lists\n');
    console.log(`Email: ${email}\n`);
    console.log('='.repeat(60));
    
    const lists = {
      'DNC - Seller outreach': process.env.RESPONSE_GENIUS_DNC_SELLER_LIST_ID,
      'DNC - Buyer outreach': process.env.RESPONSE_GENIUS_DNC_BUYER_LIST_ID,
      'DNC - CRE outreach': process.env.RESPONSE_GENIUS_DNC_CRE_LIST_ID,
      'DNC - EXF outreach': process.env.RESPONSE_GENIUS_DNC_EXF_LIST_ID,
      'Seller Cold Lead': process.env.RESPONSE_GENIUS_COLD_SELLER_LIST_ID,
      'Buyer Cold Lead': process.env.RESPONSE_GENIUS_COLD_BUYER_LIST_ID,
      'CRE Cold Lead': process.env.RESPONSE_GENIUS_COLD_CRE_LIST_ID,
      'EXF Cold Lead': process.env.RESPONSE_GENIUS_COLD_EXF_LIST_ID
    };
    
    let foundCount = 0;
    
    for (const [name, listId] of Object.entries(lists)) {
      const found = await checkContact(email, listId, name);
      if (found) foundCount++;
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Summary: Contact found on ${foundCount} out of 8 lists`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/check-contact-in-rg.js <email>');
  console.log('Example: node scripts/check-contact-in-rg.js drutscher@gmail.com');
  process.exit(1);
}

checkAllLists(email);
