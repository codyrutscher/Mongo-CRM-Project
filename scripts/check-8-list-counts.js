require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

const responseGenius8ListsService = require('../src/services/responseGenius8ListsService');

async function main() {
  try {
    console.log('Response Genius - 8 Lists Configuration\n');
    console.log('='.repeat(70));
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to Prospere CRM\n');
    
    const counts = await responseGenius8ListsService.getListCounts();
    
    console.log('DNC LISTS (4):');
    console.log('-'.repeat(70));
    let dncTotal = 0;
    ['dnc_seller', 'dnc_buyer', 'dnc_cre', 'dnc_exf'].forEach(key => {
      const info = counts[key];
      console.log(`  ${info.name.padEnd(25)} ${info.count.toLocaleString().padStart(8)} contacts`);
      console.log(`    Property: ${info.property}`);
      dncTotal += info.count;
    });
    console.log(`  ${'TOTAL DNC'.padEnd(25)} ${dncTotal.toLocaleString().padStart(8)} contacts`);
    
    console.log('\nCOLD LEAD LISTS (4):');
    console.log('-'.repeat(70));
    let coldTotal = 0;
    ['cold_seller', 'cold_buyer', 'cold_cre', 'cold_exf'].forEach(key => {
      const info = counts[key];
      console.log(`  ${info.name.padEnd(25)} ${info.count.toLocaleString().padStart(8)} contacts`);
      console.log(`    Property: ${info.property}`);
      coldTotal += info.count;
    });
    console.log(`  ${'TOTAL COLD LEAD'.padEnd(25)} ${coldTotal.toLocaleString().padStart(8)} contacts`);
    
    console.log('\n' + '='.repeat(70));
    console.log(`GRAND TOTAL: ${(dncTotal + coldTotal).toLocaleString()} contacts across 8 lists`);
    console.log('='.repeat(70));
    
    console.log('\nNext steps:');
    console.log('  1. Export CSVs: node scripts/export-8-lists-to-csv.js');
    console.log('  2. Upload CSVs to Response Genius manually, OR');
    console.log('  3. Sync via API: node scripts/sync-8-lists-to-response-genius.js');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
