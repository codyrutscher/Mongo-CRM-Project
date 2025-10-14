const axios = require('axios');

require('dotenv').config();

async function investigate500Errors() {
  console.log('Investigating 500 errors in detail...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  // From our previous run, we know these batch numbers had 500 errors:
  // Let's investigate some specific ranges that failed
  const problematicBatches = [
    { batch: 3, estimatedAfter: '200' },
    { batch: 29, estimatedAfter: '2800' },
    { batch: 38, estimatedAfter: '3700' },
    { batch: 43, estimatedAfter: '4200' },
    { batch: 78, estimatedAfter: '7700' },
    { batch: 1212, estimatedAfter: '121100' },
    { batch: 1235, estimatedAfter: '123400' },
    { batch: 1263, estimatedAfter: '126200' },
    { batch: 1286, estimatedAfter: '128500' }
  ];

  for (const problematic of problematicBatches.slice(0, 3)) { // Test first 3
    console.log(`\n🔍 Investigating batch ${problematic.batch} (around after: ${problematic.estimatedAfter})`);
    
    try {
      // Try the exact range that failed
      console.log('  Testing original batch size (100)...');
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 100,
          properties: 'email,firstname,lastname,phone,company',
          after: problematic.estimatedAfter
        },
        timeout: 30000
      });
      
      console.log(`  ✅ Batch works now! Got ${response.data.results.length} contacts`);
      
    } catch (error) {
      if (error.response && error.response.status === 500) {
        console.log(`  ❌ Still getting 500 error`);
        console.log('  Error details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          correlationId: error.response.headers['x-hubspot-correlation-id']
        });
        
        // Try smaller batches to isolate the problematic contact
        console.log('  🔍 Trying smaller batches...');
        
        for (let size of [50, 25, 10, 5, 1]) {
          try {
            console.log(`    Testing batch size ${size}...`);
            const smallResponse = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
              headers: {
                'Authorization': `Bearer ${hubspotToken}`,
                'Content-Type': 'application/json'
              },
              params: {
                limit: size,
                properties: 'email,firstname,lastname',
                after: problematic.estimatedAfter
              },
              timeout: 30000
            });
            
            console.log(`    ✅ Size ${size} works! Got ${smallResponse.data.results.length} contacts`);
            
            // If size 1 works, the issue might be with specific properties or batch size
            if (size === 1 && smallResponse.data.results.length > 0) {
              const contact = smallResponse.data.results[0];
              console.log(`    Contact details:`, {
                id: contact.id,
                email: contact.properties.email,
                firstname: contact.properties.firstname,
                lastname: contact.properties.lastname
              });
              
              // Try to get this specific contact with more properties
              try {
                console.log(`    Testing contact ${contact.id} with more properties...`);
                const detailedResponse = await axios.get(`https://api.hubapi.com/crm/v3/objects/contacts/${contact.id}`, {
                  headers: {
                    'Authorization': `Bearer ${hubspotToken}`,
                    'Content-Type': 'application/json'
                  },
                  params: {
                    properties: 'email,firstname,lastname,phone,company,jobtitle,city,state,country,lifecyclestage,createdate,lastmodifieddate'
                  }
                });
                
                console.log(`    ✅ Detailed contact fetch works`);
                
              } catch (detailError) {
                console.log(`    ❌ Detailed contact fetch failed:`, detailError.response?.status, detailError.response?.data);
              }
            }
            
            break; // Found a working size
            
          } catch (smallError) {
            console.log(`    ❌ Size ${size} failed:`, smallError.response?.status);
            
            if (size === 1) {
              console.log(`    Even size 1 failed - this contact range is completely broken`);
              console.log(`    Error:`, smallError.response?.data);
            }
          }
        }
        
        // Try different properties to see if it's property-specific
        console.log('  🔍 Testing with minimal properties...');
        try {
          const minimalResponse = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
            headers: {
              'Authorization': `Bearer ${hubspotToken}`,
              'Content-Type': 'application/json'
            },
            params: {
              limit: 10,
              properties: 'email',
              after: problematic.estimatedAfter
            },
            timeout: 30000
          });
          
          console.log(`  ✅ Minimal properties work! Got ${minimalResponse.data.results.length} contacts`);
          
        } catch (minimalError) {
          console.log(`  ❌ Even minimal properties failed:`, minimalError.response?.status);
        }
        
      } else {
        console.log(`  ❌ Different error:`, error.response?.status, error.message);
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Now let's try a different approach - test if the errors are consistent
  console.log('\n🔍 Testing error consistency...');
  
  const testAfter = '121100'; // One that failed before
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`\nAttempt ${attempt} with after: ${testAfter}`);
    
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 100,
          properties: 'email,firstname,lastname,phone,company',
          after: testAfter
        },
        timeout: 30000
      });
      
      console.log(`  ✅ Attempt ${attempt} succeeded! Got ${response.data.results.length} contacts`);
      
    } catch (error) {
      console.log(`  ❌ Attempt ${attempt} failed:`, error.response?.status);
      console.log(`  Correlation ID: ${error.response?.headers['x-hubspot-correlation-id']}`);
      console.log(`  Rate limit remaining: ${error.response?.headers['x-hubspot-ratelimit-remaining']}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Run the investigation
investigate500Errors()
  .then(() => {
    console.log('\n500 error investigation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Investigation failed:', error);
    process.exit(1);
  });