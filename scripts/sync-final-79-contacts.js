require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const RAILWAY_API = process.env.RAILWAY_API_URL || 'https://web-production-37634.up.railway.app/api';
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY;

// Map HubSpot lifecycle stages to Railway enum values
const LIFECYCLE_STAGE_MAP = {
  'subscriber': 'subscriber',
  'lead': 'lead',
  'marketingqualifiedlead': 'lead',
  'salesqualifiedlead': 'prospect',
  'opportunity': 'prospect',
  'customer': 'customer',
  'evangelist': 'evangelist',
  'other': 'lead'
};

async function syncMissingContacts() {
  console.log('=== Syncing Final 79 Missing Contacts ===\n');

  try {
    // Read the missing contact IDs
    const missingIds = JSON.parse(fs.readFileSync('missing-contacts-in-railway.json', 'utf8'));
    console.log(`Found ${missingIds.length} missing contact IDs\n`);

    let synced = 0;
    let errors = 0;
    let skipped = 0;

    // Process in batches of 10
    for (let i = 0; i < missingIds.length; i += 10) {
      const batch = missingIds.slice(i, i + 10);
      console.log(`\nProcessing batch ${Math.floor(i/10) + 1}/${Math.ceil(missingIds.length/10)}...`);

      for (const contactId of batch) {
        try {
          // Fetch contact from HubSpot
          const hubspotResponse = await axios.get(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
            {
              headers: { Authorization: `Bearer ${HUBSPOT_API_KEY}` },
              params: {
                properties: 'email,firstname,lastname,phone,mobilephone,company,lifecyclestage,hs_lead_status,jobtitle,address,city,state,zip,country,website,industry,notes,hs_object_id'
              }
            }
          );

          const contact = hubspotResponse.data.properties;
          
          // Check if contact has email
          if (!contact.email) {
            console.log(`  ⚠️  Contact ${contactId}: No email, skipping`);
            skipped++;
            continue;
          }

          // Prepare contact data for Railway
          const railwayContact = {
            email: contact.email,
            firstName: contact.firstname || '',
            lastName: contact.lastname || '',
            phone: contact.phone || contact.mobilephone || '',
            company: contact.company || '',
            jobTitle: contact.jobtitle || '',
            companyStreetAddress: contact.address || '',
            companyCity: contact.city || '',
            companyState: contact.state || '',
            companyZipCode: contact.zip || '',
            companyWebsiteURL: contact.website || '',
            industry: contact.industry || '',
            source: 'hubspot',
            sourceId: contactId
          };
          
          // Map HubSpot lifecycle stage to Railway enum
          if (contact.lifecyclestage && isNaN(contact.lifecyclestage)) {
            const mappedStage = LIFECYCLE_STAGE_MAP[contact.lifecyclestage.toLowerCase()] || 'lead';
            railwayContact.lifecycleStage = mappedStage;
          }
          
          // Store original HubSpot values in sourceMetadata
          railwayContact.sourceMetadata = {
            originalLifecycleStage: contact.lifecyclestage,
            leadStatus: contact.hs_lead_status,
            notes: contact.notes
          };

          // Sync to Railway
          const railwayResponse = await axios.post(
            `${RAILWAY_API}/contacts`,
            railwayContact
          );

          if (railwayResponse.data.success) {
            console.log(`  ✅ Synced: ${contact.email} (${contactId})`);
            synced++;
          } else {
            console.log(`  ❌ Failed: ${contact.email} - ${JSON.stringify(railwayResponse.data)}`);
            errors++;
          }

          await new Promise(resolve => setTimeout(resolve, 150));

        } catch (error) {
          if (error.response?.status === 404) {
            console.log(`  ⚠️  Contact ${contactId}: Not found in HubSpot (deleted?)`);
            skipped++;
          } else if (error.response?.status === 400) {
            const errorData = error.response?.data;
            console.log(`  ❌ 400 Error for ${contactId}: ${JSON.stringify(errorData)}`);
            errors++;
          } else {
            console.log(`  ❌ Error syncing ${contactId}: ${error.message}`);
            if (error.response?.data) {
              console.log(`     Response: ${JSON.stringify(error.response.data)}`);
            }
            errors++;
          }
        }
      }
    }

    console.log('\n=== Sync Complete ===');
    console.log(`✅ Successfully synced: ${synced}`);
    console.log(`⚠️  Skipped (no email/deleted): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total processed: ${synced + skipped + errors}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

syncMissingContacts();
