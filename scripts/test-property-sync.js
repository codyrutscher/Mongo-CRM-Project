require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

async function main() {
  const testEmail = process.argv[2];
  
  if (!testEmail) {
    console.log('Usage: node scripts/test-property-sync.js <email>');
    console.log('Example: node scripts/test-property-sync.js test@example.com');
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
  
  console.log(`✓ Contact found: ${contact.firstname} ${contact.lastname}`);
  console.log(`  Email: ${contact.email}`);
  console.log(`  Source: ${contact.source}`);
  console.log(`  HubSpot ID: ${contact.sourceId || contact.customFields?.hubspotId}\n`);
  
  console.log('Response Genius Properties:');
  console.log('='.repeat(60));
  
  console.log('\nDNC Lists:');
  console.log(`  dnc___seller_outreach: ${contact.dnc___seller_outreach ? '✓ YES' : '✗ No'}`);
  console.log(`  dnc___buyer_outreach: ${contact.dnc___buyer_outreach ? '✓ YES' : '✗ No'}`);
  console.log(`  dnc___cre_outreach: ${contact.dnc___cre_outreach ? '✓ YES' : '✗ No'}`);
  console.log(`  dnc___exf_outreach: ${contact.dnc___exf_outreach ? '✓ YES' : '✗ No'}`);
  
  console.log('\nCold Lead Lists:');
  console.log(`  seller_cold_lead: ${contact.seller_cold_lead ? '✓ YES' : '✗ No'}`);
  console.log(`  buyer_cold_lead: ${contact.buyer_cold_lead ? '✓ YES' : '✗ No'}`);
  console.log(`  cre_cold_lead: ${contact.cre_cold_lead ? '✓ YES' : '✗ No'}`);
  console.log(`  exf_cold_lead: ${contact.exf_cold_lead ? '✓ YES' : '✗ No'}`);
  
  console.log('\nCampaign Fields:');
  console.log(`  campaignType: ${contact.campaignType || '(not set)'}`);
  console.log(`  campaignStatus: ${contact.campaignStatus || '(not set)'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log(`Last synced: ${contact.lastSyncedAt || 'Never'}`);
  
  await mongoose.disconnect();
}

main();
