const axios = require('axios');

const RAILWAY_API = 'https://web-production-37634.up.railway.app/api';

async function checkContactDiscrepancy() {
  console.log('🔍 Investigating Contact Count Discrepancy');
  console.log('==========================================');
  
  try {
    // Get Railway stats
    const railwayStats = await axios.get(`${RAILWAY_API}/contacts/stats`);
    const railwayTotal = railwayStats.data.data.total;
    const bySource = railwayStats.data.data.bySource;
    
    console.log('\n📊 Railway CRM Stats:');
    console.log(`Total Contacts: ${railwayTotal}`);
    console.log('By Source:', JSON.stringify(bySource, null, 2));
    
    // Check for duplicates
    console.log('\n🔍 Checking for duplicate emails...');
    const duplicateCheck = await axios.get(`${RAILWAY_API}/contacts/duplicates?field=email`);
    if (duplicateCheck.data.success && duplicateCheck.data.data.length > 0) {
      console.log(`Found ${duplicateCheck.data.data.length} duplicate email groups`);
      console.log('Sample duplicates:', duplicateCheck.data.data.slice(0, 3));
    } else {
      console.log('✅ No duplicate emails found');
    }
    
    // Check for contacts with empty/missing HubSpot IDs
    console.log('\n🔍 Checking for contacts without HubSpot IDs...');
    const noHubSpotId = await axios.post(`${RAILWAY_API}/contacts/search`, {
      filters: {
        source: 'hubspot',
        sourceId: { $exists: false }
      },
      limit: 1
    });
    
    if (noHubSpotId.data.pagination) {
      console.log(`Contacts without sourceId: ${noHubSpotId.data.pagination.totalRecords}`);
    }
    
    // Check for test contacts
    console.log('\n🔍 Checking for test contacts...');
    const testContacts = await axios.post(`${RAILWAY_API}/contacts/search`, {
      filters: {
        $or: [
          { firstName: { $regex: 'test', $options: 'i' } },
          { email: { $regex: 'test', $options: 'i' } },
          { email: { $regex: 'example\\.com', $options: 'i' } }
        ]
      },
      limit: 1
    });
    
    if (testContacts.data.pagination) {
      console.log(`Test contacts found: ${testContacts.data.pagination.totalRecords}`);
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`Railway CRM Total: ${railwayTotal}`);
    console.log(`HubSpot Reported: 137,250`);
    console.log(`Difference: ${railwayTotal - 137250} extra contacts in Railway`);
    
    console.log('\n💡 Likely Reasons:');
    console.log('1. Test contacts created during development');
    console.log('2. Contacts deleted from HubSpot but preserved in Railway');
    console.log('3. Timing difference (HubSpot count vs sync time)');
    console.log('4. Duplicate contacts from multiple syncs');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkContactDiscrepancy()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });