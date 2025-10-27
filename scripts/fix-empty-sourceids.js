require('dotenv').config();
const axios = require('axios');

const RAILWAY_API = process.env.RAILWAY_API_URL || 'https://web-production-37634.up.railway.app/api';
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY;

async function fixEmptySourceIds() {
  console.log('=== Investigating Empty SourceIds ===\n');

  try {
    // Get sample contacts with empty sourceId
    const response = await axios.post(`${RAILWAY_API}/contacts/search`, {
      filters: { 
        source: 'hubspot',
        sourceId: ''
      },
      limit: 20
    });

    console.log(`Found ${response.data.pagination.totalRecords} contacts with empty sourceId`);
    console.log('\nSample contacts:');
    
    response.data.data.forEach((contact, i) => {
      console.log(`\n${i + 1}. ${contact.email || 'No email'}`);
      console.log(`   Name: ${contact.firstName} ${contact.lastName}`);
      console.log(`   Source: ${contact.source}`);
      console.log(`   SourceId: "${contact.sourceId}"`);
      console.log(`   Created: ${contact.createdAt}`);
      console.log(`   Railway ID: ${contact._id}`);
    });

    console.log('\n❌ PROBLEM: These contacts have source="hubspot" but sourceId=""');
    console.log('This means they were synced incorrectly.');
    console.log('\nWe need to either:');
    console.log('1. Delete these contacts (if they are duplicates)');
    console.log('2. Find their HubSpot IDs and update them');
    console.log('3. Change their source to "manual" if they are not from HubSpot');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixEmptySourceIds();
