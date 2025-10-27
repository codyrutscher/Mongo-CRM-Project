require('dotenv').config();
const hubspotService = require('../src/services/hubspotService');

async function monitorHubSpotAPI() {
  console.log('🔍 === HUBSPOT API HEALTH CHECK ===');
  
  try {
    console.log('Testing HubSpot API with small request...');
    
    const response = await hubspotService.getContacts(5);
    
    if (response.results && response.results.length > 0) {
      console.log('✅ HubSpot API is working!');
      console.log(`📊 Sample response: ${response.results.length} contacts`);
      console.log('🚀 Safe to run full resync now');
      
      // Show rate limit info
      console.log('\n📊 Rate limit status:');
      console.log('Daily remaining:', response.headers?.['x-hubspot-ratelimit-daily-remaining'] || 'unknown');
      console.log('Current remaining:', response.headers?.['x-hubspot-ratelimit-remaining'] || 'unknown');
      
      return true;
    } else {
      console.log('⚠️  API returned empty response');
      return false;
    }
    
  } catch (error) {
    console.error('❌ HubSpot API still having issues:');
    console.error(`   Status: ${error.response?.status || 'unknown'}`);
    console.error(`   Message: ${error.message}`);
    console.log('⏳ Wait 10-15 minutes and try again');
    return false;
  }
}

monitorHubSpotAPI();