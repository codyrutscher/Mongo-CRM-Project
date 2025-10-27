require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

async function main() {
  try {
    console.log('Checking DNC and Cold Lead Properties in Prospere CRM\n');
    console.log('='.repeat(60));
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to database\n');
    
    // Get total contacts
    const totalContacts = await Contact.countDocuments();
    console.log(`Total contacts: ${totalContacts}\n`);
    
    // Check for various DNC-related properties
    console.log('Checking DNC Properties:');
    console.log('-'.repeat(60));
    
    const dncProps = [
      'dnc___seller_outreach',
      'dnc___buyer_outreach',
      'dnc___cre_outreach',
      'dnc___exf_outreach',
      'dncStatus',
      'do_not_call',
      'hs_do_not_call'
    ];
    
    for (const prop of dncProps) {
      const count = await Contact.countDocuments({ [prop]: { $exists: true, $ne: null, $ne: false, $ne: '' } });
      console.log(`  ${prop}: ${count} contacts`);
      
      if (count > 0 && count <= 5) {
        const samples = await Contact.find({ [prop]: { $exists: true, $ne: null, $ne: false, $ne: '' } })
          .limit(2)
          .select(`email ${prop}`)
          .lean();
        samples.forEach(s => console.log(`    Sample: ${s.email} = ${s[prop]}`));
      }
    }
    
    console.log('\nChecking Cold Lead Properties:');
    console.log('-'.repeat(60));
    
    const coldLeadProps = [
      'seller_cold_lead',
      'buyer_cold_lead',
      'cre_cold_lead',
      'exf_cold_lead',
      'customFields.sellerColdLead',
      'customFields.buyerColdLead',
      'customFields.creColdLead',
      'customFields.exfColdLead',
      'customFields.coldLead'
    ];
    
    for (const prop of coldLeadProps) {
      const count = await Contact.countDocuments({ [prop]: { $exists: true, $ne: null, $ne: false, $ne: '' } });
      console.log(`  ${prop}: ${count} contacts`);
      
      if (count > 0 && count <= 5) {
        const samples = await Contact.find({ [prop]: { $exists: true, $ne: null, $ne: false, $ne: '' } })
          .limit(2)
          .select(`email ${prop} customFields`)
          .lean();
        samples.forEach(s => {
          const value = prop.includes('.') ? s.customFields?.[prop.split('.')[1]] : s[prop];
          console.log(`    Sample: ${s.email} = ${value}`);
        });
      }
    }
    
    // Check for any contacts with tags
    console.log('\nChecking Tags:');
    console.log('-'.repeat(60));
    const withDncTag = await Contact.countDocuments({ tags: 'DNC' });
    const withColdLeadTag = await Contact.countDocuments({ tags: 'Cold Lead' });
    console.log(`  DNC tag: ${withDncTag} contacts`);
    console.log(`  Cold Lead tag: ${withColdLeadTag} contacts`);
    
    if (withColdLeadTag > 0) {
      const samples = await Contact.find({ tags: 'Cold Lead' })
        .limit(3)
        .select('email tags customFields')
        .lean();
      console.log('\n  Sample Cold Lead contacts:');
      samples.forEach(s => {
        console.log(`    ${s.email}`);
        console.log(`      Tags: ${s.tags?.join(', ')}`);
        if (s.customFields) {
          console.log(`      Cold Lead Types: ${s.customFields.coldLeadTypes?.join(', ') || 'none'}`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
