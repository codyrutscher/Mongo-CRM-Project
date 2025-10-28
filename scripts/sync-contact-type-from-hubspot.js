require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const axios = require('axios');

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_API_URL = 'https://api.hubapi.com';

// Map HubSpot contact_type values to our campaignType
// Contacts can have multiple values separated by semicolons
const parseContactType = (contactTypeValue) => {
  if (!contactTypeValue) return [];
  
  const types = [];
  const value = contactTypeValue.toLowerCase();
  
  // Check for each type (case insensitive, can be in any format)
  if (value.includes('buyer')) types.push('Buyer');
  if (value.includes('seller')) types.push('Seller');
  if (value.includes('cre')) types.push('CRE');
  if (value.includes('exf') || value.includes('exit factor')) types.push('Exit Factor');
  
  return types;
};

async function syncContactTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('   SYNC CONTACT TYPE FROM HUBSPOT');
    console.log('═══════════════════════════════════════════════════════\n');

    // Get all HubSpot contacts from our database
    const contacts = await Contact.find({ source: 'hubspot' }).lean();
    console.log(`📊 Found ${contacts.length.toLocaleString()} HubSpot contacts in database\n`);

    console.log('🔍 Fetching contact_type property from HubSpot...\n');

    let processed = 0;
    let updated = 0;
    let withContactType = 0;
    const stats = {
      buyer: 0,
      seller: 0,
      cre: 0,
      exitFactor: 0,
      multiple: 0,
      none: 0
    };

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      // Fetch contact_type for each contact in batch
      const promises = batch.map(async (contact) => {
        const hubspotId = contact.customFields?.hubspotId;
        if (!hubspotId) return null;

        try {
          const response = await axios.get(
            `${HUBSPOT_API_URL}/crm/v3/objects/contacts/${hubspotId}`,
            {
              params: {
                properties: 'contact_type',
                hapikey: HUBSPOT_API_KEY
              }
            }
          );

          const contactType = response.data.properties.contact_type;
          if (contactType) {
            withContactType++;
            const types = parseContactType(contactType);
            
            // Count stats
            if (types.includes('Buyer')) stats.buyer++;
            if (types.includes('Seller')) stats.seller++;
            if (types.includes('CRE')) stats.cre++;
            if (types.includes('Exit Factor')) stats.exitFactor++;
            
            if (types.length > 1) stats.multiple++;
            else if (types.length === 0) stats.none++;
            
            // Update contact
            const primaryType = types[0] || '';
            await Contact.updateOne(
              { _id: contact._id },
              {
                $set: {
                  campaignType: primaryType,
                  'customFields.campaignTypes': types,
                  'customFields.contactTypeRaw': contactType
                }
              }
            );
            updated++;
            
            return { email: contact.email, contactType, types };
          }
          return null;
        } catch (error) {
          if (error.response?.status !== 404) {
            console.error(`Error for ${contact.email}:`, error.message);
          }
          return null;
        }
      });

      await Promise.all(promises);
      processed += batch.length;

      if (processed % 1000 === 0) {
        console.log(`  Progress: ${processed.toLocaleString()}/${contacts.length.toLocaleString()} (${updated} updated, ${withContactType} with contact_type)`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Processing complete!`);
    console.log(`  Processed: ${processed.toLocaleString()}`);
    console.log(`  With contact_type: ${withContactType.toLocaleString()}`);
    console.log(`  Updated: ${updated.toLocaleString()}\n`);

    // Show statistics
    console.log('═══════════════════════════════════════════════════════');
    console.log('   CAMPAIGN TYPE STATISTICS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`🛒 Buyer contacts: ${stats.buyer.toLocaleString()}`);
    console.log(`💼 Seller contacts: ${stats.seller.toLocaleString()}`);
    console.log(`🏢 CRE contacts: ${stats.cre.toLocaleString()}`);
    console.log(`🚀 Exit Factor contacts: ${stats.exitFactor.toLocaleString()}`);
    console.log(`\n🔀 Contacts with multiple types: ${stats.multiple.toLocaleString()}`);
    console.log(`⚪ Contacts with no type: ${stats.none.toLocaleString()}\n`);

    // Show final distribution
    const finalCounts = await Contact.aggregate([
      { $match: { source: 'hubspot' } },
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Primary Campaign Type Distribution:');
    finalCounts.forEach(item => {
      const label = item._id || '(not set)';
      console.log(`  ${label}: ${item.count.toLocaleString()}`);
    });

    console.log('\n═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

syncContactTypes();
