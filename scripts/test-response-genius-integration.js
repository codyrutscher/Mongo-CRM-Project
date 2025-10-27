require('dotenv').config();
const responseGeniusService = require('../src/services/responseGeniusService');

/**
 * Test Response Genius integration
 */

async function testResponseGeniusIntegration() {
  console.log('=== Testing Response Genius Integration ===\n');

  // Check configuration
  console.log('📋 Configuration Check:');
  console.log(`   API ID: ${process.env.RESPONSE_GENIUS_API_ID && process.env.RESPONSE_GENIUS_API_ID !== 'your_api_id_here' ? '✅ Set' : '❌ Not set'}`);
  console.log(`   API Key: ${process.env.RESPONSE_GENIUS_API_KEY && process.env.RESPONSE_GENIUS_API_KEY !== 'your_api_key_here' ? '✅ Set' : '❌ Not set'}`);
  console.log(`   API URL: ${process.env.RESPONSE_GENIUS_API_URL || 'https://control.responsegenius.com'}`);
  console.log('\n   List IDs:');
  console.log(`   - Seller: ${responseGeniusService.lists.seller}`);
  console.log(`   - Buyer: ${responseGeniusService.lists.buyer}`);
  console.log(`   - CRE: ${responseGeniusService.lists.cre}`);
  console.log(`   - EXF: ${responseGeniusService.lists.exf}`);

  // Test with a sample contact
  console.log('\n🧪 Testing with sample Cold Lead contact...\n');
  
  const testContact = {
    email: 'test.coldlead@example.com',
    firstName: 'Test',
    lastName: 'Cold Lead',
    phone: '555-0123',
    sourceId: 'test-123',
    customFields: {
      sellerColdLead: true,
      buyerColdLead: false,
      creColdLead: true,
      exfColdLead: false
    }
  };

  console.log('Test Contact:');
  console.log(`   Email: ${testContact.email}`);
  console.log(`   Name: ${testContact.firstName} ${testContact.lastName}`);
  console.log(`   Cold Lead Types: Seller, CRE`);
  console.log('');

  try {
    const result = await responseGeniusService.syncColdLead(testContact);
    
    if (result.success) {
      console.log('✅ Sync Test Successful!');
      console.log(`   Synced to lists: ${result.syncedTo.join(', ')}`);
      
      if (result.results.seller?.dryRun) {
        console.log('\n💡 Running in DRY RUN mode (API credentials not configured)');
        console.log('   To enable real syncing:');
        console.log('   1. Go to: https://control.responsegenius.com/help/api_identifier');
        console.log('   2. Copy your API ID and API Key');
        console.log('   3. Add them to .env file');
      }
    } else {
      console.log('❌ Sync Test Failed');
      console.log(`   Error: ${result.error}`);
    }

    console.log('\n📊 Detailed Results:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }

  // Test removal
  console.log('\n🧪 Testing contact removal...\n');
  
  try {
    const removeResult = await responseGeniusService.removeFromAllLists(testContact.email);
    
    if (removeResult.success) {
      console.log('✅ Removal Test Successful!');
      console.log(`   Removed from lists: ${removeResult.removedFrom.join(', ')}`);
    } else {
      console.log('❌ Removal Test Failed');
    }

  } catch (error) {
    console.error('❌ Removal Test Error:', error.message);
  }

  console.log('\n=== Integration Test Complete ===');
  console.log('\n📝 Next Steps:');
  console.log('1. Get your API credentials:');
  console.log('   https://control.responsegenius.com/help/api_identifier');
  console.log('2. Add RESPONSE_GENIUS_API_ID and RESPONSE_GENIUS_API_KEY to .env');
  console.log('3. Run: node scripts/initial-response-genius-sync.js');
  console.log('4. Start your server to enable real-time webhook syncing');
  console.log('5. Test by creating a Cold Lead in HubSpot');
}

testResponseGeniusIntegration();
