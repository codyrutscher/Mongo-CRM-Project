require('dotenv').config();
const mongoose = require('mongoose');

// Connect to Prospere CRM database
const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

const responseGeniusDncService = require('../src/services/responseGeniusDncService');

async function main() {
  try {
    console.log('Connecting to Prospere CRM database...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully!\n');

    console.log('='.repeat(60));
    console.log('SYNCING DNC LISTS TO RESPONSE GENIUS');
    console.log('='.repeat(60));

    const results = await responseGeniusDncService.syncAllLists();

    console.log('\n' + '='.repeat(60));
    console.log('SYNC RESULTS');
    console.log('='.repeat(60));
    
    for (const [listType, result] of Object.entries(results)) {
      console.log(`\n${listType.toUpperCase()} List:`);
      if (result.success) {
        console.log(`  ✓ Successfully synced ${result.added} contacts`);
      } else {
        console.log(`  ✗ Failed: ${result.error}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

main();
