require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const responseGenius8ListsService = require('../src/services/responseGenius8ListsService');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

async function main() {
  const testEmail = process.argv[2];
  const property = process.argv[3];
  const value = process.argv[4] === 'true';
  
  if (!testEmail || !property) {
    console.log('Usage: node scripts/test-automatic-sync-to-response-genius.js <email> <property> <true|false>');
    console.log('\nExample:');
    console.log('  node scripts/test-automatic-sync-to-response-genius.js test@example.com seller_cold_lead true');
    console.log('\nAvailable properties:');
    console.log('  - dnc___seller_outreach');
    console.log('  - dnc___buyer_outreach');
    console.log('  - dnc___cre_outreach');
    console.log('  - dnc___exf_outreach');
    console.log('  - seller_cold_lead');
    console.log('  - buyer_cold_lead');
    console.log('  - cre_cold_lead');
    console.log('  - exf_cold_lead');
    return;
  }
  
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to Prospere CRM\n');
  
  const contact = await Contact.findOne({ email: testEmail });
  
  if (!contact) {
    console.log(`✗ Contact not found: ${testEmail}`);
    await mongoose.disconnect();
    return;
  }
  
  console.log(`Found contact: ${contact.firstname} ${contact.lastname}`);
  console.log(`Email: ${contact.email}\n`);
  
  console.log(`Setting ${property} = ${value}...`);
  contact[property] = value;
  await contact.save();
  console.log('✓ Updated in Prospere CRM\n');
  
  console.log('Syncing to Response Genius...');
  const result = await responseGenius8ListsService.handleContactPropertyChange(contact, property);
  
  if (result.success) {
    console.log(`\n✅ SUCCESS!`);
    console.log(`   Action: ${result.action}`);
    console.log(`   List: ${result.listName}`);
    console.log(`   Contact: ${contact.email}`);
  } else {
    console.log(`\n✗ FAILED: ${result.error}`);
  }
  
  await mongoose.disconnect();
}

main();
