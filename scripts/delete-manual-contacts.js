require('dotenv').config();
const axios = require('axios');

const RAILWAY_API = process.env.RAILWAY_API_URL || 'https://web-production-37634.up.railway.app/api';

async function deleteManualContacts() {
  console.log('=== Deleting Manual Contacts ===\n');

  try {
    const response = await axios.post(`${RAILWAY_API}/contacts/search`, {
      filters: { source: 'manual' },
      limit: 200
    });

    const contacts = response.data.data;
    console.log(`Found ${contacts.length} manual contacts to delete\n`);

    let deleted = 0;
    let errors = 0;

    for (const contact of contacts) {
      try {
        await axios.delete(`${RAILWAY_API}/contacts/${contact._id}`);
        console.log(`✅ Deleted: ${contact.email || 'No email'} (${contact._id})`);
        deleted++;
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`❌ Error deleting ${contact._id}: ${error.message}`);
        errors++;
      }
    }

    console.log('\n=== Deletion Complete ===');
    console.log(`✅ Deleted: ${deleted}`);
    console.log(`❌ Errors: ${errors}`);

    // Get new count
    const statsResponse = await axios.get(`${RAILWAY_API}/contacts/stats`);
    const newTotal = statsResponse.data.data.total;
    console.log(`\n📊 New Railway Total: ${newTotal.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteManualContacts();
