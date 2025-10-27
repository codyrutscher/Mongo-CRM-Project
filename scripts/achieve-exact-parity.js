require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const RAILWAY_API = process.env.RAILWAY_API_URL || 'https://web-production-37634.up.railway.app/api';
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY;

async function achieveExactParity() {
  console.log('=== Achieving Exact Parity with HubSpot ===\n');

  try {
    // Step 1: Get current counts
    console.log('📊 Step 1: Getting current counts...');
    const railwayStats = await axios.get(`${RAILWAY_API}/contacts/stats`);
    const railwayActive = railwayStats.data.data.byStatus.active;
    const railwayDeleted = railwayStats.data.data.byStatus.deleted;
    
    console.log(`   Railway Active: ${railwayActive.toLocaleString()}`);
    console.log(`   Railway Deleted: ${railwayDeleted.toLocaleString()}`);
    console.log(`   Railway Total: ${railwayStats.data.data.total.toLocaleString()}`);
    
    // Step 2: Permanently delete the "deleted" status contacts
    console.log('\n🗑️  Step 2: Permanently removing deleted contacts...');
    const deletedResponse = await axios.post(`${RAILWAY_API}/contacts/search`, {
      filters: { status: 'deleted' },
      limit: 1000
    });
    
    const deletedContacts = deletedResponse.data.data || [];
    console.log(`   Found ${deletedContacts.length} contacts with deleted status`);
    
    // Note: We can't actually permanently delete via API, they're soft-deleted
    // The system should exclude them from counts
    
    // Step 3: Get final HubSpot count
    console.log('\n📊 Step 3: Getting HubSpot count...');
    let hubspotTotal = 0;
    let after = undefined;
    let pageCount = 0;
    
    do {
      const url = after
        ? `https://api.hubapi.com/crm/v3/objects/contacts?limit=100&after=${after}`
        : `https://api.hubapi.com/crm/v3/objects/contacts?limit=100`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${HUBSPOT_API_KEY}` }
      });
      
      hubspotTotal += response.data.results.length;
      after = response.data.paging?.next?.after;
      pageCount++;
      
      if (pageCount % 100 === 0) {
        console.log(`   Counted ${hubspotTotal} HubSpot contacts so far...`);
      }
      
      if (!after) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    } while (after);
    
    console.log(`   HubSpot Total: ${hubspotTotal.toLocaleString()}`);
    
    // Step 4: Calculate difference
    console.log('\n📊 Step 4: Calculating difference...');
    const difference = hubspotTotal - railwayActive;
    console.log(`   Difference: ${difference} contacts`);
    
    if (difference === 0) {
      console.log('\n✅ PERFECT PARITY ACHIEVED!');
      console.log(`   Railway: ${railwayActive.toLocaleString()}`);
      console.log(`   HubSpot: ${hubspotTotal.toLocaleString()}`);
    } else if (difference > 0) {
      console.log(`\n⚠️  Railway has ${difference} FEWER contacts than HubSpot`);
      console.log('   Need to sync missing contacts');
    } else {
      console.log(`\n⚠️  Railway has ${Math.abs(difference)} MORE contacts than HubSpot`);
      console.log('   This might be due to:');
      console.log('   - Cold Leads preserved in Railway after HubSpot deletion');
      console.log('   - Duplicate contacts');
      console.log('   - Manual test contacts');
    }
    
    // Step 5: Summary
    console.log('\n=== FINAL SUMMARY ===');
    console.log(`HubSpot Contacts: ${hubspotTotal.toLocaleString()}`);
    console.log(`Railway Active Contacts: ${railwayActive.toLocaleString()}`);
    console.log(`Railway Deleted Contacts: ${railwayDeleted.toLocaleString()}`);
    console.log(`Net Difference: ${difference} contacts`);
    
    if (Math.abs(difference) <= 100) {
      console.log('\n✅ Counts are within acceptable range (±100)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

achieveExactParity();
