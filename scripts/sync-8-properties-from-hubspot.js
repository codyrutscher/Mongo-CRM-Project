require('dotenv').config();
const mongoose = require('mongoose');
const hubspotService = require('../src/services/hubspotService');
const Contact = require('../src/models/Contact');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

async function main() {
  try {
    console.log('Syncing 8 Response Genius Properties from HubSpot\n');
    console.log('='.repeat(70));
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to Prospere CRM\n');
    
    console.log('Fetching all contacts from HubSpot...');
    console.log('(This may take several minutes)\n');
    
    const hubspotContacts = await hubspotService.getAllContacts();
    console.log(`✓ Fetched ${hubspotContacts.length.toLocaleString()} contacts from HubSpot\n`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    const properties = [
      'dnc___seller_outreach',
      'dnc___buyer_outreach',
      'dnc___cre_outreach',
      'dnc___exf_outreach',
      'seller_cold_lead',
      'buyer_cold_lead',
      'cre_cold_lead',
      'exf_cold_lead'
    ];
    
    console.log('Updating contacts in Prospere CRM...\n');
    
    for (let i = 0; i < hubspotContacts.length; i++) {
      const hsContact = hubspotContacts[i];
      
      if ((i + 1) % 1000 === 0) {
        console.log(`  Processed ${(i + 1).toLocaleString()}/${hubspotContacts.length.toLocaleString()} contacts...`);
      }
      
      try {
        const props = hsContact.properties;
        const updates = {};
        let hasUpdate = false;
        
        // Check each of the 8 properties
        for (const prop of properties) {
          const value = props[prop] === 'true' || props[prop] === true;
          updates[prop] = value;
          if (value) hasUpdate = true;
        }
        
        if (hasUpdate) {
          const result = await Contact.updateOne(
            { 
              source: 'hubspot',
              sourceId: hsContact.id
            },
            { $set: updates }
          );
          
          if (result.modifiedCount > 0) {
            updated++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
        
      } catch (error) {
        errors++;
        if (errors < 10) {
          console.error(`  Error for contact ${hsContact.id}: ${error.message}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(70));
    console.log(`  Total contacts: ${hubspotContacts.length.toLocaleString()}`);
    console.log(`  Updated: ${updated.toLocaleString()} contacts`);
    console.log(`  Skipped: ${skipped.toLocaleString()} contacts (no properties set)`);
    console.log(`  Errors: ${errors.toLocaleString()}`);
    console.log('='.repeat(70));
    
    console.log('\nNext steps:');
    console.log('  1. Check counts: node scripts/check-8-list-counts.js');
    console.log('  2. Export CSVs: node scripts/export-8-lists-to-csv.js');
    console.log('  3. Sync to Response Genius: node scripts/sync-8-lists-to-response-genius.js');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
