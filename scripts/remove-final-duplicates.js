require('dotenv').config();
const axios = require('axios');

const RAILWAY_API = process.env.RAILWAY_API_URL || 'https://web-production-37634.up.railway.app/api';

async function removeDuplicates() {
  console.log('=== Removing Duplicate Contacts ===\n');

  try {
    // Get duplicates
    const dupResponse = await axios.get(`${RAILWAY_API}/contacts/duplicates?field=email`);
    
    if (!dupResponse.data.success || dupResponse.data.data.length === 0) {
      console.log('✅ No duplicates found');
      return;
    }

    const duplicateGroups = dupResponse.data.data;
    console.log(`Found ${duplicateGroups.length} duplicate email groups\n`);

    let totalRemoved = 0;
    let errors = 0;

    for (const group of duplicateGroups) {
      console.log(`\n📧 Email: ${group._id}`);
      console.log(`   Count: ${group.count} duplicates`);
      
      // Fetch all contacts with this email
      const searchResponse = await axios.post(`${RAILWAY_API}/contacts/search`, {
        filters: { email: group._id },
        limit: 100
      });

      const contacts = searchResponse.data.data;
      
      if (contacts.length <= 1) {
        console.log('   ⚠️  Only 1 contact found, skipping');
        continue;
      }

      // Sort by: 1) has sourceId, 2) most recent
      contacts.sort((a, b) => {
        // Prefer contacts with sourceId
        if (a.sourceId && !b.sourceId) return -1;
        if (!a.sourceId && b.sourceId) return 1;
        
        // Then by most recent
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Keep the first one, delete the rest
      const toKeep = contacts[0];
      const toDelete = contacts.slice(1);

      console.log(`   ✅ Keeping: ${toKeep._id} (sourceId: ${toKeep.sourceId || 'none'})`);
      
      for (const contact of toDelete) {
        try {
          await axios.delete(`${RAILWAY_API}/contacts/${contact._id}`);
          console.log(`   🗑️  Deleted: ${contact._id} (sourceId: ${contact.sourceId || 'none'})`);
          totalRemoved++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.log(`   ❌ Error deleting ${contact._id}: ${error.message}`);
          errors++;
        }
      }
    }

    console.log('\n=== Cleanup Complete ===');
    console.log(`✅ Removed: ${totalRemoved} duplicate contacts`);
    console.log(`❌ Errors: ${errors}`);

    // Get new count
    const statsResponse = await axios.get(`${RAILWAY_API}/contacts/stats`);
    const newTotal = statsResponse.data.data.total;
    console.log(`\n📊 New Railway Total: ${newTotal.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

removeDuplicates();
