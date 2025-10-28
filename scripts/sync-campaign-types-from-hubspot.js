require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

// Mapping from HubSpot contact_type values to our campaignType enum
const CONTACT_TYPE_MAPPING = {
  'EXF': 'Exit Factor',
  'ExF': 'Exit Factor',
  'Exit Factor': 'Exit Factor',
  'exit factor': 'Exit Factor',
  'CRE': 'CRE',
  'cre': 'CRE',
  'Buyer': 'Buyer',
  'buyer': 'Buyer',
  'Seller': 'Seller',
  'seller': 'Seller'
};

async function syncCampaignTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Check current state
    console.log('📊 Current Campaign Type Distribution:');
    const beforeCounts = await Contact.aggregate([
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    beforeCounts.forEach(item => {
      console.log(`  ${item._id || '(empty)'}: ${item.count}`);
    });

    // Find contacts with contact_type in customFields
    console.log('\n🔍 Searching for contacts with contact_type in customFields...');
    
    const contactsWithType = await Contact.find({
      'customFields.contactType': { $exists: true, $ne: null, $ne: '' }
    }).lean();

    console.log(`Found ${contactsWithType.length} contacts with contact_type in customFields`);

    // Also check for HubSpot contacts that might have it stored differently
    const allContacts = await Contact.find({ source: 'hubspot' }).lean();
    console.log(`Total HubSpot contacts: ${allContacts.length}`);

    // Sample a few to see the structure
    if (allContacts.length > 0) {
      console.log('\n📋 Sample contact customFields structure:');
      const sample = allContacts[0];
      console.log('Keys in customFields:', Object.keys(sample.customFields || {}));
      
      // Check if any have contactType
      const withContactType = allContacts.filter(c => 
        c.customFields && (
          c.customFields.contactType || 
          c.customFields.contact_type ||
          c.customFields.accountType
        )
      );
      console.log(`Contacts with contactType/contact_type/accountType: ${withContactType.length}`);
      
      if (withContactType.length > 0) {
        console.log('\nSample values:');
        withContactType.slice(0, 5).forEach(c => {
          console.log(`  - ${c.email}: ${c.customFields.contactType || c.customFields.contact_type || c.customFields.accountType}`);
        });
      }
    }

    // Update contacts based on customFields.contactType or customFields.accountType
    let updated = 0;
    const updates = [];

    for (const contact of allContacts) {
      if (!contact.customFields) continue;
      
      const contactType = contact.customFields.contactType || 
                         contact.customFields.contact_type || 
                         contact.customFields.accountType;
      
      if (!contactType) continue;

      // Map the value
      const mappedType = CONTACT_TYPE_MAPPING[contactType];
      
      if (mappedType && contact.campaignType !== mappedType) {
        updates.push({
          updateOne: {
            filter: { _id: contact._id },
            update: { $set: { campaignType: mappedType } }
          }
        });
        updated++;
      }
    }

    if (updates.length > 0) {
      console.log(`\n📝 Updating ${updates.length} contacts...`);
      const result = await Contact.bulkWrite(updates);
      console.log(`✅ Updated ${result.modifiedCount} contacts`);
    } else {
      console.log('\n⚠️  No contacts found with valid contact_type values to update');
      console.log('\nThis might mean:');
      console.log('1. HubSpot contact_type field is not being synced to customFields');
      console.log('2. The field name is different in HubSpot');
      console.log('3. No contacts have this field set in HubSpot');
    }

    // Show final distribution
    console.log('\n📊 Final Campaign Type Distribution:');
    const afterCounts = await Contact.aggregate([
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    afterCounts.forEach(item => {
      console.log(`  ${item._id || '(empty)'}: ${item.count}`);
    });

    console.log('\n✨ Sync complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncCampaignTypes();
