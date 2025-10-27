require('dotenv').config();
const axios = require('axios');

const RAILWAY_API = process.env.RAILWAY_API_URL || 'https://web-production-37634.up.railway.app/api';

async function checkManualContacts() {
  console.log('=== Checking Manual Contacts ===\n');

  try {
    const response = await axios.post(`${RAILWAY_API}/contacts/search`, {
      filters: { source: 'manual' },
      limit: 106,
      sort: { createdAt: -1 }
    });

    console.log(`Found ${response.data.pagination.totalRecords} manual contacts\n`);
    
    response.data.data.forEach((contact, i) => {
      console.log(`${i + 1}. ${contact.email || 'No email'}`);
      console.log(`   Name: ${contact.firstName} ${contact.lastName}`);
      console.log(`   SourceId: ${contact.sourceId}`);
      console.log(`   Created: ${contact.createdAt}`);
      console.log(`   ID: ${contact._id}`);
      console.log('');
    });

    console.log('\n💡 These appear to be test contacts created during sync testing');
    console.log('We should delete them to match HubSpot exactly.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkManualContacts();
