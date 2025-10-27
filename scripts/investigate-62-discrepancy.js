require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const RAILWAY_API = process.env.RAILWAY_API_URL || 'https://web-production-37634.up.railway.app/api';
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY;
const BATCH_SIZE = 100;

async function getAllHubSpotContactIds() {
  console.log('Fetching all HubSpot contact IDs...');
  const allIds = new Set();
  let after = undefined;
  let page = 0;

  try {
    do {
      const url = after
        ? `https://api.hubapi.com/crm/v3/objects/contacts?limit=${BATCH_SIZE}&after=${after}&properties=email`
        : `https://api.hubapi.com/crm/v3/objects/contacts?limit=${BATCH_SIZE}&properties=email`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${HUBSPOT_API_KEY}` }
      });

      response.data.results.forEach(contact => {
        allIds.add(contact.id);
      });

      after = response.data.paging?.next?.after;
      page++;
      
      if (page % 100 === 0) {
        console.log(`Fetched ${allIds.size} HubSpot contacts so far...`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    } while (after);

    console.log(`Total HubSpot contacts: ${allIds.size}`);
    return allIds;
  } catch (error) {
    console.error('Error fetching HubSpot contacts:', error.response?.data || error.message);
    throw error;
  }
}

async function getAllRailwayContactIds() {
  console.log('Fetching all Railway contact IDs...');
  const allIds = new Set();
  let page = 1;
  const limit = 1000;
  let hasMore = true;

  try {
    while (hasMore) {
      const response = await axios.post(`${RAILWAY_API}/contacts/search`, {
        filters: { source: 'hubspot' },
        page,
        limit
      });

      if (response.data.success && response.data.data) {
        response.data.data.forEach(contact => {
          if (contact.sourceId) {
            allIds.add(contact.sourceId);
          }
        });

        const pagination = response.data.pagination;
        
        hasMore = pagination && pagination.current < pagination.total;
        page++;
        
        if (page % 10 === 0) {
          console.log(`Fetched ${allIds.size} Railway contacts so far (page ${page-1}/${pagination.total})...`);
        }
      } else {
        hasMore = false;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Total Railway contacts with HubSpot IDs: ${allIds.size}`);
    return allIds;
  } catch (error) {
    console.error('Error fetching Railway contacts:', error.message);
    throw error;
  }
}

async function analyzeDiscrepancy() {
  console.log('=== Investigating 62 Contact Discrepancy ===\n');

  try {
    // Get all IDs from both systems
    const [hubspotIds, railwayIds] = await Promise.all([
      getAllHubSpotContactIds(),
      getAllRailwayContactIds()
    ]);

    console.log('\n=== Summary ===');
    console.log(`HubSpot contacts: ${hubspotIds.size}`);
    console.log(`Railway contacts: ${railwayIds.size}`);
    console.log(`Discrepancy: ${hubspotIds.size - railwayIds.size}`);

    // Find contacts in HubSpot but not in Railway
    const missingInRailway = [...hubspotIds].filter(id => !railwayIds.has(id));
    console.log(`\n=== Contacts in HubSpot but NOT in Railway: ${missingInRailway.length} ===`);
    
    if (missingInRailway.length > 0) {
      console.log('\nFetching details for missing contacts...');
      
      for (let i = 0; i < Math.min(missingInRailway.length, 100); i += 10) {
        const batch = missingInRailway.slice(i, i + 10);
        const ids = batch.join(',');
        
        try {
          const response = await axios.get(
            `https://api.hubapi.com/crm/v3/objects/contacts/batch/read?properties=email,firstname,lastname,phone,lifecyclestage,hs_object_id`,
            {
              headers: { Authorization: `Bearer ${HUBSPOT_API_KEY}` },
              data: { inputs: batch.map(id => ({ id })) }
            }
          );

          response.data.results.forEach(contact => {
            console.log(`  ID: ${contact.id}`);
            console.log(`    Email: ${contact.properties.email || 'N/A'}`);
            console.log(`    Name: ${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`);
            console.log(`    Phone: ${contact.properties.phone || 'N/A'}`);
            console.log(`    Lifecycle: ${contact.properties.lifecyclestage || 'N/A'}`);
            console.log('');
          });

          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error fetching batch: ${error.message}`);
        }
      }

      if (missingInRailway.length > 100) {
        console.log(`\n... and ${missingInRailway.length - 100} more contacts`);
      }

      // Save missing IDs to file for reference
      const fs = require('fs');
      fs.writeFileSync(
        'missing-contacts-in-railway.json',
        JSON.stringify(missingInRailway, null, 2)
      );
      console.log('\nSaved all missing contact IDs to: missing-contacts-in-railway.json');
    }

    // Find contacts in Railway but not in HubSpot (shouldn't happen unless deleted)
    const missingInHubSpot = [...railwayIds].filter(id => !hubspotIds.has(id));
    console.log(`\n=== Contacts in Railway but NOT in HubSpot: ${missingInHubSpot.length} ===`);
    
    if (missingInHubSpot.length > 0) {
      console.log('These might be Cold Leads or deleted contacts:');
      
      // Fetch sample contacts from Railway
      for (let i = 0; i < Math.min(missingInHubSpot.length, 50); i++) {
        try {
          const response = await axios.post(`${RAILWAY_API}/contacts/search`, {
            filters: { sourceId: missingInHubSpot[i] },
            limit: 1
          });

          if (response.data.success && response.data.data.length > 0) {
            const contact = response.data.data[0];
            console.log(`  ID: ${contact.sourceId}`);
            console.log(`    Email: ${contact.email || 'N/A'}`);
            console.log(`    Name: ${contact.firstName || ''} ${contact.lastName || ''}`);
            console.log(`    Tags: ${contact.tags || 'N/A'}`);
            console.log(`    Labels: ${contact.labels || 'N/A'}`);
            console.log('');
          }
        } catch (error) {
          // Skip if error
        }
      }

      if (missingInHubSpot.length > 50) {
        console.log(`... and ${missingInHubSpot.length - 50} more contacts`);
      }
    }

    // Check for contacts without HubSpot IDs in Railway
    console.log('\n=== Checking Railway contacts WITHOUT HubSpot ID ===');
    try {
      const noIdResponse = await axios.post(`${RAILWAY_API}/contacts/search`, {
        filters: { 
          source: { $ne: 'hubspot' }
        },
        limit: 1
      });

      if (noIdResponse.data.pagination) {
        const count = noIdResponse.data.pagination.totalRecords;
        console.log(`Railway contacts WITHOUT HubSpot source: ${count}`);

        if (count > 0 && noIdResponse.data.data.length > 0) {
          console.log('\nSample contacts without HubSpot source:');
          const sampleResponse = await axios.post(`${RAILWAY_API}/contacts/search`, {
            filters: { 
              source: { $ne: 'hubspot' }
            },
            limit: 20
          });

          sampleResponse.data.data.forEach(contact => {
            console.log(`  Railway ID: ${contact._id}`);
            console.log(`    Email: ${contact.email || 'N/A'}`);
            console.log(`    Name: ${contact.firstName || ''} ${contact.lastName || ''}`);
            console.log(`    Source: ${contact.source || 'N/A'}`);
            console.log(`    Tags: ${contact.tags || 'N/A'}`);
            console.log(`    Labels: ${contact.labels || 'N/A'}`);
            console.log(`    Created: ${contact.createdAt}`);
            console.log('');
          });
        }
      }
    } catch (error) {
      console.log('Could not fetch non-HubSpot contacts:', error.message);
    }

    console.log('\n=== Analysis Complete ===');

  } catch (error) {
    console.error('Error during analysis:', error);
  }
}

analyzeDiscrepancy();
