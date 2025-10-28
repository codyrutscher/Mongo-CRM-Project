require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_API_URL = 'https://api.hubapi.com';

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

async function fetchContactTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('🔍 Fetching contact_type field from HubSpot...\n');

    // Get a sample of contacts from database
    const sampleContacts = await Contact.find({ source: 'hubspot' })
      .limit(10)
      .lean();

    if (sampleContacts.length === 0) {
      console.log('❌ No HubSpot contacts found in database');
      process.exit(1);
    }

    console.log(`📋 Checking ${sampleContacts.length} sample contacts in HubSpot...\n`);

    let foundContactType = false;
    let contactsWithType = 0;

    for (const contact of sampleContacts) {
      const hubspotId = contact.customFields?.hubspotId;
      
      if (!hubspotId) {
        console.log(`⚠️  ${contact.email}: No HubSpot ID found`);
        continue;
      }

      try {
        // Fetch contact from HubSpot with contact_type property
        const response = await axios.get(
          `${HUBSPOT_API_URL}/crm/v3/objects/contacts/${hubspotId}`,
          {
            params: {
              properties: 'email,contact_type,account_type',
              hapikey: HUBSPOT_API_KEY
            }
          }
        );

        const props = response.data.properties;
        const contactType = props.contact_type || props.account_type;

        if (contactType) {
          foundContactType = true;
          contactsWithType++;
          const mappedType = CONTACT_TYPE_MAPPING[contactType] || contactType;
          console.log(`✅ ${props.email}: contact_type = "${contactType}" → "${mappedType}"`);
        } else {
          console.log(`⚠️  ${props.email}: No contact_type or account_type field`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`❌ ${contact.email}: Error fetching from HubSpot - ${error.message}`);
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`  Contacts checked: ${sampleContacts.length}`);
    console.log(`  Contacts with type: ${contactsWithType}`);

    if (!foundContactType) {
      console.log('\n⚠️  No contacts have contact_type field in HubSpot');
      console.log('\nPossible reasons:');
      console.log('1. The field is named differently in HubSpot');
      console.log('2. The field is not set for any contacts');
      console.log('3. The field needs to be created in HubSpot first');
      console.log('\n💡 Recommendation: Upload your CSV file instead to set campaign types');
    } else {
      console.log('\n✅ Found contact_type field! Running full sync...');
      await syncAllContactTypes();
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function syncAllContactTypes() {
  console.log('\n🔄 Syncing campaign types for all HubSpot contacts...');
  
  const allContacts = await Contact.find({ source: 'hubspot' }).lean();
  console.log(`Total contacts to sync: ${allContacts.length}`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allContacts.length; i++) {
    const contact = allContacts[i];
    const hubspotId = contact.customFields?.hubspotId;

    if (!hubspotId) {
      skipped++;
      continue;
    }

    try {
      const response = await axios.get(
        `${HUBSPOT_API_URL}/crm/v3/objects/contacts/${hubspotId}`,
        {
          params: {
            properties: 'contact_type,account_type',
            hapikey: HUBSPOT_API_KEY
          }
        }
      );

      const props = response.data.properties;
      const contactType = props.contact_type || props.account_type;

      if (contactType) {
        const mappedType = CONTACT_TYPE_MAPPING[contactType];
        
        if (mappedType) {
          await Contact.updateOne(
            { _id: contact._id },
            { $set: { campaignType: mappedType } }
          );
          updated++;
        }
      }

      // Progress indicator
      if ((i + 1) % 100 === 0) {
        console.log(`  Progress: ${i + 1}/${allContacts.length} (${updated} updated)`);
      }

      // Rate limiting - 100 requests per 10 seconds
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      errors++;
      if (errors < 5) {
        console.log(`  Error for ${contact.email}: ${error.message}`);
      }
    }
  }

  console.log(`\n✅ Sync complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);

  // Show final distribution
  const finalCounts = await Contact.aggregate([
    { $group: { _id: '$campaignType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  console.log('\n📊 Final Campaign Type Distribution:');
  finalCounts.forEach(item => {
    console.log(`  ${item._id || '(empty)'}: ${item.count}`);
  });
}

fetchContactTypes();
