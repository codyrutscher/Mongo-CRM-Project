require('dotenv').config();
const mongoose = require('mongoose');
const hubspotService = require('../src/services/hubspotService');
const Contact = require('../src/models/Contact');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

async function main() {
  const testEmail = process.argv[2];
  
  if (!testEmail) {
    console.log('Usage: node scripts/manually-sync-contact-from-hubspot.js <email>');
    console.log('Example: node scripts/manually-sync-contact-from-hubspot.js test@example.com');
    return;
  }
  
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to Prospere CRM\n');
  
  // Find contact in Prospere
  const prospereContact = await Contact.findOne({ email: testEmail });
  
  if (!prospereContact) {
    console.log(`✗ Contact not found in Prospere: ${testEmail}`);
    await mongoose.disconnect();
    return;
  }
  
  const hubspotId = prospereContact.sourceId || prospereContact.customFields?.hubspotId;
  
  if (!hubspotId) {
    console.log(`✗ No HubSpot ID found for: ${testEmail}`);
    await mongoose.disconnect();
    return;
  }
  
  console.log(`Found contact in Prospere:`);
  console.log(`  Name: ${prospereContact.firstname} ${prospereContact.lastname}`);
  console.log(`  Email: ${prospereContact.email}`);
  console.log(`  HubSpot ID: ${hubspotId}\n`);
  
  console.log('Fetching latest data from HubSpot...');
  
  try {
    const hsResponse = await hubspotService.getContacts(1, null, hubspotId);
    
    if (!hsResponse.results || !hsResponse.results[0]) {
      console.log('✗ Contact not found in HubSpot');
      await mongoose.disconnect();
      return;
    }
    
    const hsContact = hsResponse.results[0];
    const props = hsContact.properties;
    
    console.log('✓ Fetched from HubSpot\n');
    
    console.log('HubSpot Properties:');
    console.log('='.repeat(60));
    console.log('\nDNC Lists:');
    console.log(`  dnc___seller_outreach: ${props.dnc___seller_outreach || 'false'}`);
    console.log(`  dnc___buyer_outreach: ${props.dnc___buyer_outreach || 'false'}`);
    console.log(`  dnc___cre_outreach: ${props.dnc___cre_outreach || 'false'}`);
    console.log(`  dnc___exf_outreach: ${props.dnc___exf_outreach || 'false'}`);
    
    console.log('\nCold Lead Lists:');
    console.log(`  seller_cold_lead: ${props.seller_cold_lead || 'false'}`);
    console.log(`  buyer_cold_lead: ${props.buyer_cold_lead || 'false'}`);
    console.log(`  cre_cold_lead: ${props.cre_cold_lead || 'false'}`);
    console.log(`  exf_cold_lead: ${props.exf_cold_lead || 'false'}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('\nUpdating Prospere CRM...');
    
    // Transform and update
    const contactData = hubspotService.transformContactData(hsContact);
    
    Object.assign(prospereContact, contactData);
    prospereContact.lastSyncedAt = new Date();
    
    await prospereContact.save();
    
    console.log('✓ Updated in Prospere CRM\n');
    
    console.log('Updated Properties in Prospere:');
    console.log('='.repeat(60));
    console.log('\nDNC Lists:');
    console.log(`  dnc___seller_outreach: ${prospereContact.dnc___seller_outreach ? '✓ YES' : '✗ No'}`);
    console.log(`  dnc___buyer_outreach: ${prospereContact.dnc___buyer_outreach ? '✓ YES' : '✗ No'}`);
    console.log(`  dnc___cre_outreach: ${prospereContact.dnc___cre_outreach ? '✓ YES' : '✗ No'}`);
    console.log(`  dnc___exf_outreach: ${prospereContact.dnc___exf_outreach ? '✓ YES' : '✗ No'}`);
    
    console.log('\nCold Lead Lists:');
    console.log(`  seller_cold_lead: ${prospereContact.seller_cold_lead ? '✓ YES' : '✗ No'}`);
    console.log(`  buyer_cold_lead: ${prospereContact.buyer_cold_lead ? '✓ YES' : '✗ No'}`);
    console.log(`  cre_cold_lead: ${prospereContact.cre_cold_lead ? '✓ YES' : '✗ No'}`);
    console.log(`  exf_cold_lead: ${prospereContact.exf_cold_lead ? '✓ YES' : '✗ No'}`);
    
    console.log('\n✅ Sync complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await mongoose.disconnect();
}

main();
