require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

async function main() {
  try {
    console.log('Checking DNC Contact Deletion Behavior\n');
    console.log('='.repeat(60));
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to database\n');
    
    // Check contacts with DNC status
    console.log('DNC Contacts Status:');
    console.log('-'.repeat(60));
    
    const dncContacts = await Contact.countDocuments({ 
      tags: 'DNC',
      status: 'active'
    });
    
    const deletedDncContacts = await Contact.countDocuments({ 
      tags: 'DNC',
      status: 'deleted'
    });
    
    const dncDeletedFromHubSpot = await Contact.countDocuments({ 
      tags: 'DNC',
      'customFields.deletedFromHubSpot': true
    });
    
    console.log(`  Active DNC contacts: ${dncContacts}`);
    console.log(`  Deleted DNC contacts: ${deletedDncContacts}`);
    console.log(`  DNC contacts deleted from HubSpot (but preserved): ${dncDeletedFromHubSpot}`);
    
    // Check Cold Lead contacts
    console.log('\nCold Lead Contacts Status:');
    console.log('-'.repeat(60));
    
    const coldLeadContacts = await Contact.countDocuments({ 
      'customFields.coldLead': true,
      status: 'active'
    });
    
    const deletedColdLeadContacts = await Contact.countDocuments({ 
      'customFields.coldLead': true,
      status: 'deleted'
    });
    
    const coldLeadDeletedFromHubSpot = await Contact.countDocuments({ 
      'customFields.coldLead': true,
      'customFields.deletedFromHubSpot': true
    });
    
    console.log(`  Active Cold Lead contacts: ${coldLeadContacts}`);
    console.log(`  Deleted Cold Lead contacts: ${deletedColdLeadContacts}`);
    console.log(`  Cold Lead contacts deleted from HubSpot (but preserved): ${coldLeadDeletedFromHubSpot}`);
    
    // Check overlap - contacts that are BOTH DNC AND Cold Lead
    console.log('\nContacts that are BOTH DNC and Cold Lead:');
    console.log('-'.repeat(60));
    
    const bothDncAndColdLead = await Contact.countDocuments({ 
      tags: 'DNC',
      'customFields.coldLead': true,
      status: 'active'
    });
    
    console.log(`  Active contacts with both: ${bothDncAndColdLead}`);
    
    // Current behavior summary
    console.log('\n' + '='.repeat(60));
    console.log('CURRENT DELETION BEHAVIOR:');
    console.log('='.repeat(60));
    console.log('\n✓ Cold Lead contacts: PRESERVED when deleted from HubSpot');
    console.log('✗ DNC-only contacts: MARKED AS DELETED when deleted from HubSpot');
    console.log('\nRecommendation: Update webhook to preserve ALL DNC contacts');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
