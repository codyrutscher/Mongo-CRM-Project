require('dotenv').config();
const axios = require('axios');

async function analyzeCorruptedContacts() {
  try {
    console.log('🔬 === ANALYZING CORRUPTED CONTACT PATTERNS ===');
    
    // Test different property combinations to find what's causing the corruption
    const propertyTests = [
      {
        name: "Minimal Properties",
        properties: "firstname,lastname,email"
      },
      {
        name: "Basic Properties", 
        properties: "firstname,lastname,email,phone,company"
      },
      {
        name: "Standard Properties",
        properties: "firstname,lastname,email,phone,company,jobtitle,website,city,state"
      },
      {
        name: "All Original Properties", 
        properties: "firstname,lastname,email,phone,company,jobtitle,website,city,state,country,createdate,lastmodifieddate,lifecyclestage,do_not_call,hs_email_optout"
      },
      {
        name: "Only System Properties",
        properties: "createdate,lastmodifieddate,lifecyclestage"
      },
      {
        name: "Only Contact Info",
        properties: "firstname,lastname,email,phone"
      },
      {
        name: "Only Business Properties",
        properties: "company,jobtitle,website"
      },
      {
        name: "Only Location Properties", 
        properties: "city,state,country"
      },
      {
        name: "Only DNC Properties",
        properties: "do_not_call,hs_email_optout"
      }
    ];

    const problematicToken = "18302";
    
    for (const test of propertyTests) {
      console.log(`\n🧪 Testing: ${test.name}`);
      console.log(`   Properties: ${test.properties}`);
      
      try {
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params: {
            properties: test.properties,
            limit: 100,
            after: problematicToken
          },
          timeout: 30000
        });

        console.log(`✅ SUCCESS! Properties work: ${test.properties}`);
        console.log(`   Fetched ${response.data.results.length} contacts`);
        
        // If this works, let's see what the data looks like
        if (response.data.results.length > 0) {
          const sampleContact = response.data.results[0];
          console.log(`   Sample contact ID: ${sampleContact.id}`);
          console.log(`   Sample properties:`, JSON.stringify(sampleContact.properties, null, 2));
        }
        
      } catch (error) {
        console.log(`❌ FAILED: ${error.response?.status} - ${error.message}`);
        if (error.response?.data) {
          console.log(`   Error details:`, JSON.stringify(error.response.data, null, 2));
        }
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test if it's about specific contacts by trying different pagination points
    console.log('\n📊 Testing different pagination points...');
    const testTokens = ["18300", "18301", "18302", "18303", "18304", "18305"];
    
    for (const token of testTokens) {
      try {
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params: {
            properties: "firstname,lastname,email",
            limit: 10, // Small batch
            after: token
          },
          timeout: 30000
        });

        console.log(`✅ Token ${token}: Success - ${response.data.results.length} contacts`);
        
      } catch (error) {
        console.log(`❌ Token ${token}: Failed - ${error.response?.status}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Analysis failed:', error);
  }
}

analyzeCorruptedContacts();
