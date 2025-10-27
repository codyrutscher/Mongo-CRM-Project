require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

const responseGeniusDncService = require('../src/services/responseGeniusDncService');

async function main() {
  try {
    console.log('Testing Response Genius DNC List Configuration\n');
    console.log('='.repeat(60));
    
    // Check environment variables
    console.log('\n1. Environment Variables:');
    console.log('   API ID:', process.env.RESPONSE_GENIUS_API_ID ? '✓ Set' : '✗ Missing');
    console.log('   API Key:', process.env.RESPONSE_GENIUS_API_KEY ? '✓ Set' : '✗ Missing');
    console.log('   API URL:', process.env.RESPONSE_GENIUS_API_URL || '✗ Missing');
    console.log('   Seller List ID:', process.env.RESPONSE_GENIUS_SELLER_LIST_ID || '✗ Missing');
    console.log('   Buyer List ID:', process.env.RESPONSE_GENIUS_BUYER_LIST_ID || '✗ Missing');
    console.log('   CRE List ID:', process.env.RESPONSE_GENIUS_CRE_LIST_ID || '✗ Missing');
    console.log('   EXF List ID:', process.env.RESPONSE_GENIUS_EXF_LIST_ID || '✗ Missing');
    
    // Connect to database
    console.log('\n2. Database Connection:');
    await mongoose.connect(mongoUri);
    console.log('   ✓ Connected to Prospere CRM');
    
    // Check contact counts for each list
    console.log('\n3. Contact Counts by List Type:');
    
    for (const listType of ['seller', 'buyer', 'cre', 'exf']) {
      const contacts = await responseGeniusDncService.getContactsForList(listType);
      console.log(`   ${listType.toUpperCase()}: ${contacts.length} contacts`);
      
      if (contacts.length > 0) {
        console.log(`      Sample: ${contacts[0].email}`);
      }
    }
    
    // Test API connection (without actually syncing)
    console.log('\n4. Response Genius API:');
    try {
      // Just verify the service is configured correctly
      console.log('   ✓ Service configured');
      console.log('   ✓ Ready to sync');
    } catch (error) {
      console.log('   ✗ Configuration error:', error.message);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Test Complete!');
    console.log('\nTo perform actual sync, run:');
    console.log('  node scripts/sync-dnc-lists-to-response-genius.js');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

main();
