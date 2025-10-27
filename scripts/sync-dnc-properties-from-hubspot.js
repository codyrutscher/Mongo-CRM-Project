require('dotenv').config();
const mongoose = require('mongoose');
const hubspotService = require('../src/services/hubspotService');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

async function syncDNCProperties() {
  console.log('Syncing DNC Properties from HubSpot to Prospere CRM\n');
  console.log('='.repeat(70));
  
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to Prospere CRM\n');
  
  // Get all contacts with DNC status
  const dncContacts = await Contact.find({ 
    dncStatus: 'dnc_internal',
    'customFields.hubspotId': { $exists: true }
  }).select('email customFields').lean();
  
  console.log(`Found ${dncContacts.length.toLocaleString()} DNC contacts to check\n`);
  
  let updated = 0;
  let errors = 0;
  let checked = 0;
  
  const dncProperties = [
    'dnc___seller_outreach',
    'dnc___buyer_outreach',
    'dnc___cre_outreach',
    'dnc___exf_outreach'
  ];
  
  console.log('Fetching properties from HubSpot...\n');
  
  for (const contact of dncContacts) {
    checked++;
    
    if (checked % 100 === 0) {
      console.log(`  Checked ${checked.toLocaleString()}/${dncContacts.length.toLocaleString()} contacts...`);
    }
    
    try {
      const hubspotId = contact.customFields.hubspotId;
      
      // Fetch contact from HubSpot with DNC properties
      const hsContact = await hubspotService.getContacts(1, null, hubspotId);
      
      if (hsContact && hsContact.results && hsContact.results[0]) {
        const props = hsContact.results[0].properties;
        let hasUpdate = false;
        const updates = {};
        
        // Check each DNC property
        for (const prop of dncProperties) {
          if (props[prop] === 'true' || props[prop] === true) {
            updates[prop] = true;
            hasUpdate = true;
          }
        }
        
        if (hasUpdate) {
          await Contact.updateOne(
            { _id: contact._id },
            { $set: updates }
          );
          updated++;
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      errors++;
      if (errors < 10) {
        console.error(`  Error for ${contact.email}: ${error.message}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('SYNC COMPLETE');
  console.log('='.repeat(70));
  console.log(`  Checked: ${checked.toLocaleString()} contacts`);
  console.log(`  Updated: ${updated.toLocaleString()} contacts`);
  console.log(`  Errors: ${errors.toLocaleString()}`);
  console.log('='.repeat(70));
  
  await mongoose.disconnect();
}

syncDNCProperties().catch(console.error);
