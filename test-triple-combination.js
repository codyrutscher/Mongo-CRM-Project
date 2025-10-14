require('dotenv').config();
const axios = require('axios');

async function testTripleCombination() {
  try {
    console.log('🎯 === TESTING THE TRIPLE COMBINATION ISSUE ===');
    
    const problematicToken = "18302";
    
    // Test the exact failing combination with different batch sizes
    const batchTests = [
      { name: "Batch Size 1", limit: 1 },
      { name: "Batch Size 5", limit: 5 },
      { name: "Batch Size 10", limit: 10 },
      { name: "Batch Size 25", limit: 25 },
      { name: "Batch Size 50", limit: 50 },
      { name: "Batch Size 100", limit: 100 }
    ];
    
    const problematicProperties = "company,jobtitle,website";
    
    for (const test of batchTests) {
      try {
        console.log(`\n🧪 Testing ${test.name} with properties: ${problematicProperties}`);
        
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params: {
            properties: problematicProperties,
            limit: test.limit,
            after: problematicToken
          },
          timeout: 30000
        });

        console.log(`✅ ${test.name}: SUCCESS - fetched ${response.data.results.length} contacts`);
        
        // Look for any obviously corrupted data
        for (let i = 0; i < Math.min(3, response.data.results.length); i++) {
          const contact = response.data.results[i];
          console.log(`   Contact ${i+1} (ID: ${contact.id}):`);
          console.log(`     Company: "${contact.properties.company}"`);
          console.log(`     JobTitle: "${contact.properties.jobtitle}"`);
          console.log(`     Website: "${contact.properties.website}"`);
          
          // Check for potentially corrupted data patterns
          const props = contact.properties;
          if (props.company && (props.company.length > 500 || props.company.includes('\x00'))) {
            console.log(`     ⚠️  Suspicious company field length/content`);
          }
          if (props.jobtitle && (props.jobtitle.length > 500 || props.jobtitle.includes('\x00'))) {
            console.log(`     ⚠️  Suspicious jobtitle field length/content`);
          }
          if (props.website && (props.website.length > 500 || props.website.includes('\x00'))) {
            console.log(`     ⚠️  Suspicious website field length/content`);
          }
        }
        
      } catch (error) {
        console.log(`❌ ${test.name}: FAILED - ${error.response?.status}`);
        console.log(`   Error: ${error.response?.data?.message}`);
        console.log(`   Correlation ID: ${error.response?.data?.correlationId}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error('💥 Triple combination test failed:', error);
  }
}

testTripleCombination();
