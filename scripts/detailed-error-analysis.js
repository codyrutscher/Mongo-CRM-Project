const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function detailedErrorAnalysis() {
  console.log('Starting detailed error analysis...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  // First, let's get the exact count from HubSpot
  try {
    console.log('🔍 Getting exact count from HubSpot...');
    const countResponse = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        limit: 1,
        properties: 'email'
      }
    });
    
    const totalInHubSpot = countResponse.data.total;
    console.log(`📊 HubSpot reports ${totalInHubSpot} total contacts`);
    
    // Now let's analyze the 500 errors in detail
    console.log('\n🔍 Analyzing 500 errors in detail...');
    
    let after = undefined;
    let totalProcessed = 0;
    let batchNumber = 1;
    const errorDetails = [];
    const problematicRanges = [];

    while (totalProcessed < totalInHubSpot) {
      try {
        console.log(`\nTesting batch ${batchNumber} (after: ${after})...`);
        
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            limit: 100,
            properties: 'email,firstname,lastname,phone,company',
            ...(after && { after })
          },
          timeout: 30000
        });

        const contacts = response.data.results;
        if (!contacts || contacts.length === 0) {
          console.log('No more contacts available');
          break;
        }

        console.log(`✅ Batch ${batchNumber}: Got ${contacts.length} contacts`);
        totalProcessed += contacts.length;

        // Move to next batch
        if (response.data.paging && response.data.paging.next) {
          after = response.data.paging.next.after;
        } else {
          console.log('No more pages available');
          break;
        }

      } catch (error) {
        if (error.response && error.response.status === 500) {
          console.log(`❌ 500 ERROR in batch ${batchNumber}`);
          
          // Capture detailed error information
          const errorDetail = {
            batchNumber,
            after,
            timestamp: new Date().toISOString(),
            errorMessage: error.message,
            responseData: error.response?.data,
            responseHeaders: error.response?.headers,
            requestUrl: error.config?.url,
            requestParams: error.config?.params
          };
          
          errorDetails.push(errorDetail);
          
          console.log('Error details:', JSON.stringify({
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            headers: {
              'x-hubspot-correlation-id': error.response?.headers['x-hubspot-correlation-id'],
              'x-hubspot-ratelimit-remaining': error.response?.headers['x-hubspot-ratelimit-remaining'],
              'x-hubspot-ratelimit-daily-remaining': error.response?.headers['x-hubspot-ratelimit-daily-remaining']
            }
          }, null, 2));
          
          // Try to identify the problematic range
          console.log('🔍 Investigating problematic range...');
          
          // Try with smaller batches to isolate the issue
          let rangeStart = after;
          let recovered = 0;
          
          for (let smallBatch = 1; smallBatch <= 10; smallBatch++) {
            try {
              console.log(`  Testing small batch ${smallBatch} (limit: 10)...`);
              
              const smallResponse = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
                headers: {
                  'Authorization': `Bearer ${hubspotToken}`,
                  'Content-Type': 'application/json'
                },
                params: {
                  limit: 10,
                  properties: 'email,firstname,lastname',
                  ...(after && { after })
                },
                timeout: 30000
              });

              const smallContacts = smallResponse.data.results;
              console.log(`    ✅ Small batch ${smallBatch}: Got ${smallContacts.length} contacts`);
              recovered += smallContacts.length;
              
              if (smallResponse.data.paging && smallResponse.data.paging.next) {
                after = smallResponse.data.paging.next.after;
              } else {
                break;
              }
              
            } catch (smallError) {
              console.log(`    ❌ Small batch ${smallBatch} also failed:`, smallError.response?.status, smallError.message);
              
              if (smallError.response?.status === 500) {
                // This specific range is problematic
                problematicRanges.push({
                  startAfter: rangeStart,
                  endAfter: after,
                  batchNumber,
                  smallBatch,
                  error: smallError.response?.data
                });
                
                // Skip ahead to try to get past the problematic contact
                console.log('    ⏭️ Skipping problematic contact...');
                after = after ? (parseInt(after) + 1).toString() : '1';
                break;
              }
            }
          }
          
          console.log(`  Recovered ${recovered} contacts from error batch ${batchNumber}`);
          totalProcessed += recovered;
          
        } else {
          console.log(`❌ Different error in batch ${batchNumber}:`, error.response?.status, error.message);
          break;
        }
      }

      batchNumber++;
      
      // Safety break
      if (batchNumber > 2000) {
        console.log('Safety break - too many batches');
        break;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Analysis Summary:`);
    console.log(`HubSpot total: ${totalInHubSpot}`);
    console.log(`Processed: ${totalProcessed}`);
    console.log(`Missing: ${totalInHubSpot - totalProcessed}`);
    console.log(`500 errors encountered: ${errorDetails.length}`);
    console.log(`Problematic ranges: ${problematicRanges.length}`);
    
    if (errorDetails.length > 0) {
      console.log('\n🔍 Detailed Error Analysis:');
      errorDetails.forEach((error, index) => {
        console.log(`\nError ${index + 1}:`);
        console.log(`  Batch: ${error.batchNumber}`);
        console.log(`  After: ${error.after}`);
        console.log(`  Time: ${error.timestamp}`);
        console.log(`  Response: ${JSON.stringify(error.responseData)}`);
        console.log(`  Correlation ID: ${error.responseHeaders?.['x-hubspot-correlation-id']}`);
      });
    }
    
    if (problematicRanges.length > 0) {
      console.log('\n🚨 Problematic Ranges:');
      problematicRanges.forEach((range, index) => {
        console.log(`\nRange ${index + 1}:`);
        console.log(`  Start after: ${range.startAfter}`);
        console.log(`  End after: ${range.endAfter}`);
        console.log(`  Batch: ${range.batchNumber}`);
        console.log(`  Error: ${JSON.stringify(range.error)}`);
      });
    }

  } catch (error) {
    console.error('Fatal error during analysis:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the analysis
detailedErrorAnalysis()
  .then(() => {
    console.log('\nDetailed error analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });