require('dotenv').config();
const axios = require('axios');

async function isolateCorruptedProperty() {
  try {
    console.log('🎯 === ISOLATING THE EXACT CORRUPTED PROPERTY ===');
    
    const problematicToken = "18302";
    
    // Test each business property individually
    const individualTests = [
      { name: "Company Only", properties: "company" },
      { name: "Job Title Only", properties: "jobtitle" }, 
      { name: "Website Only", properties: "website" }
    ];
    
    console.log('\n🔬 Testing individual business properties:');
    for (const test of individualTests) {
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

        console.log(`✅ ${test.name}: SUCCESS`);
        
      } catch (error) {
        console.log(`❌ ${test.name}: FAILED - ${error.response?.status}`);
        console.log(`   Error: ${error.response?.data?.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Test combinations
    const combinationTests = [
      { name: "Company + JobTitle", properties: "company,jobtitle" },
      { name: "Company + Website", properties: "company,website" },
      { name: "JobTitle + Website", properties: "jobtitle,website" }
    ];
    
    console.log('\n🔬 Testing business property combinations:');
    for (const test of combinationTests) {
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

        console.log(`✅ ${test.name}: SUCCESS`);
        
      } catch (error) {
        console.log(`❌ ${test.name}: FAILED - ${error.response?.status}`);
        console.log(`   Error: ${error.response?.data?.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
  } catch (error) {
    console.error('💥 Isolation test failed:', error);
  }
}

isolateCorruptedProperty();
