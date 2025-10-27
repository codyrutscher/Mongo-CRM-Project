require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

const responseGenius8ListsService = require('../src/services/responseGenius8ListsService');

async function main() {
  try {
    console.log('Syncing 8 Lists to Response Genius\n');
    console.log('='.repeat(70));
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to Prospere CRM\n');

    const results = await responseGenius8ListsService.syncAllLists();

    console.log('\n' + '='.repeat(70));
    console.log('SYNC RESULTS');
    console.log('='.repeat(70));
    
    console.log('\nDNC LISTS:');
    console.log('-'.repeat(70));
    let dncTotal = 0;
    ['dnc_seller', 'dnc_buyer', 'dnc_cre', 'dnc_exf'].forEach(key => {
      const result = results[key];
      if (result.success) {
        console.log(`  ✓ ${result.listName.padEnd(25)} ${result.added.toLocaleString().padStart(8)} contacts`);
        dncTotal += result.added;
      } else {
        console.log(`  ✗ ${result.listName.padEnd(25)} Error: ${result.error}`);
      }
    });
    
    console.log('\nCOLD LEAD LISTS:');
    console.log('-'.repeat(70));
    let coldTotal = 0;
    ['cold_seller', 'cold_buyer', 'cold_cre', 'cold_exf'].forEach(key => {
      const result = results[key];
      if (result.success) {
        console.log(`  ✓ ${result.listName.padEnd(25)} ${result.added.toLocaleString().padStart(8)} contacts`);
        coldTotal += result.added;
      } else {
        console.log(`  ✗ ${result.listName.padEnd(25)} Error: ${result.error}`);
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log(`Total synced: ${(dncTotal + coldTotal).toLocaleString()} contacts`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
