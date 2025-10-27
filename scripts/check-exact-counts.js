require('dotenv').config();
const axios = require('axios');

const RAILWAY_API = process.env.RAILWAY_API_URL || 'https://web-production-37634.up.railway.app/api';

async function checkCounts() {
  console.log('=== Checking Exact Counts ===\n');

  try {
    // Get Railway total
    const railwayStats = await axios.get(`${RAILWAY_API}/contacts/stats`);
    const railwayTotal = railwayStats.data.data.total;
    
    console.log(`Railway Total: ${railwayTotal.toLocaleString()}`);
    console.log(`HubSpot Total: ~137,284 (from last check)`);
    console.log(`Difference: ${railwayTotal - 137284}`);
    
    // Check for duplicates
    console.log('\n🔍 Checking for duplicate emails...');
    const dupResponse = await axios.get(`${RAILWAY_API}/contacts/duplicates?field=email`);
    if (dupResponse.data.success && dupResponse.data.data.length > 0) {
      console.log(`Found ${dupResponse.data.data.length} duplicate email groups`);
      
      let totalDupes = 0;
      dupResponse.data.data.forEach(group => {
        totalDupes += group.count - 1; // -1 because we keep one
      });
      console.log(`Total duplicate contacts to remove: ${totalDupes}`);
    } else {
      console.log('✅ No duplicate emails found');
    }
    
    // Check for contacts without sourceId
    console.log('\n🔍 Checking for contacts without HubSpot sourceId...');
    const noSourceIdResponse = await axios.post(`${RAILWAY_API}/contacts/search`, {
      filters: { 
        source: 'hubspot',
        sourceId: { $exists: false }
      },
      limit: 1
    });
    
    if (noSourceIdResponse.data.pagination) {
      const count = noSourceIdResponse.data.pagination.totalRecords;
      console.log(`Contacts with source=hubspot but no sourceId: ${count}`);
    }
    
    // Check for contacts with empty sourceId
    console.log('\n🔍 Checking for contacts with empty sourceId...');
    const emptySourceIdResponse = await axios.post(`${RAILWAY_API}/contacts/search`, {
      filters: { 
        source: 'hubspot',
        sourceId: ''
      },
      limit: 1
    });
    
    if (emptySourceIdResponse.data.pagination) {
      const count = emptySourceIdResponse.data.pagination.totalRecords;
      console.log(`Contacts with empty sourceId: ${count}`);
    }
    
    // Check by source
    console.log('\n📊 Contacts by Source:');
    const bySource = railwayStats.data.data.bySource || {};
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`   ${source}: ${count.toLocaleString()}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCounts();
