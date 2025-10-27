const axios = require('axios');

require('dotenv').config();

async function getExactHubSpotCount() {
  console.log('Getting exact HubSpot contact count...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  try {
    // Try the search API to get total count
    console.log('🔍 Trying search API...');
    const searchResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      filterGroups: [],
      properties: ['email'],
      limit: 1
    }, {
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Search API response:', {
      total: searchResponse.data.total,
      results: searchResponse.data.results?.length
    });
    
    // Also try the regular API and count manually
    console.log('\n🔍 Manually counting via pagination...');
    let after = undefined;
    let totalCounted = 0;
    let batchNumber = 1;
    let errorCount = 0;
    
    while (true) {
      try {
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            limit: 100,
            properties: 'email',
            ...(after && { after })
          },
          timeout: 30000
        });

        const contacts = response.data.results;
        if (!contacts || contacts.length === 0) {
          console.log('No more contacts available');
          break;
        }

        totalCounted += contacts.length;
        
        if (batchNumber % 100 === 0) {
          console.log(`Batch ${batchNumber}: Counted ${totalCounted} contacts so far...`);
        }

        // Move to next batch
        if (response.data.paging && response.data.paging.next) {
          after = response.data.paging.next.after;
        } else {
          console.log('No more pages available');
          break;
        }

      } catch (error) {
        if (error.response && error.response.status === 500) {
          errorCount++;
          console.log(`❌ 500 error in batch ${batchNumber} (error #${errorCount})`);
          console.log('Error details:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            correlationId: error.response.headers['x-hubspot-correlation-id'],
            after: after
          });
          
          // Try to skip past the problematic contact
          if (after) {
            after = (parseInt(after) + 100).toString();
            console.log(`Skipping to after: ${after}`);
          } else {
            after = '100';
          }
          
        } else {
          console.log(`❌ Different error in batch ${batchNumber}:`, error.response?.status, error.message);
          break;
        }
      }

      batchNumber++;
      
      // Safety break
      if (batchNumber > 2000) {
        console.log('Safety break - reached 2000 batches');
        break;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`\n📊 Final Count Results:`);
    console.log(`Search API total: ${searchResponse.data.total}`);
    console.log(`Manual count: ${totalCounted}`);
    console.log(`500 errors encountered: ${errorCount}`);
    console.log(`Estimated missing due to errors: ${errorCount * 100}`);
    console.log(`Estimated actual total: ${totalCounted + (errorCount * 100)}`);

  } catch (error) {
    console.error('Error getting count:', error.response?.data || error.message);
    throw error;
  }
}

// Run the count
getExactHubSpotCount()
  .then(() => {
    console.log('\nCount analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Count failed:', error);
    process.exit(1);
  });