const axios = require('axios');

const RAILWAY_API_BASE = 'https://web-production-37634.up.railway.app/api';

async function checkRailwaySyncProgress() {
  console.log('🚂 Checking Railway Cold Lead Sync Progress...');
  console.log('==============================================');
  
  try {
    // Get contact statistics
    console.log('📊 Getting contact statistics...');
    const statsResponse = await axios.get(`${RAILWAY_API_BASE}/contacts/stats`);
    
    if (statsResponse.data.success) {
      const stats = statsResponse.data.data;
      console.log(`✅ Total contacts in Railway: ${stats.total}`);
      
      // Check for Cold Lead tags
      console.log('\\n🔍 Searching for Cold Lead contacts...');
      const coldLeadSearch = await axios.post(`${RAILWAY_API_BASE}/contacts/search`, {
        tags: 'Cold Lead'
      });
      
      if (coldLeadSearch.data.success) {
        const coldLeads = coldLeadSearch.data.data;
        console.log(`✅ Found ${coldLeads.length} Cold Lead contacts`);
        
        if (coldLeads.length > 0) {
          console.log('\\n📋 Sample Cold Lead contacts:');
          coldLeads.slice(0, 5).forEach((contact, index) => {
            console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email})`);
            console.log(`   Company: ${contact.company || 'N/A'}`);
            console.log(`   Tags: ${contact.tags?.join(', ') || 'None'}`);
            console.log(`   Cold Lead Types: ${contact.customFields?.coldLeadTypes?.join(', ') || 'Unknown'}`);
            console.log('');
          });
        }
        
        // Check for specific Cold Lead types
        console.log('\\n🏷️ Checking Cold Lead types...');
        const sellerSearch = await axios.post(`${RAILWAY_API_BASE}/contacts/search`, {
          tags: 'Cold Lead - Seller'
        });
        const buyerSearch = await axios.post(`${RAILWAY_API_BASE}/contacts/search`, {
          tags: 'Cold Lead - Buyer'
        });
        const creSearch = await axios.post(`${RAILWAY_API_BASE}/contacts/search`, {
          tags: 'Cold Lead - CRE'
        });
        const exfSearch = await axios.post(`${RAILWAY_API_BASE}/contacts/search`, {
          tags: 'Cold Lead - EXF'
        });
        
        console.log(`Seller Cold Leads: ${sellerSearch.data.success ? sellerSearch.data.data.length : 'Error'}`);
        console.log(`Buyer Cold Leads: ${buyerSearch.data.success ? buyerSearch.data.data.length : 'Error'}`);
        console.log(`CRE Cold Leads: ${creSearch.data.success ? creSearch.data.data.length : 'Error'}`);
        console.log(`EXF Cold Leads: ${exfSearch.data.success ? exfSearch.data.data.length : 'Error'}`);
      }
      
      // Check if Doug Broomes exists (he should be deleted)
      console.log('\\n🔍 Checking for Doug Broomes (should be deleted)...');
      const dougSearch = await axios.post(`${RAILWAY_API_BASE}/contacts/search`, {
        email: 'doug@ironwood-works.com'
      });
      
      if (dougSearch.data.success && dougSearch.data.data.length > 0) {
        const doug = dougSearch.data.data[0];
        console.log('⚠️  Doug Broomes found in Railway:');
        console.log(`   Name: ${doug.firstName} ${doug.lastName}`);
        console.log(`   Email: ${doug.email}`);
        console.log(`   Company: ${doug.company}`);
        console.log(`   Status: ${doug.status}`);
        console.log(`   Tags: ${doug.tags?.join(', ') || 'None'}`);
        console.log(`   Deleted from HubSpot: ${doug.customFields?.deletedFromHubSpot || 'false'}`);
      } else {
        console.log('❌ Doug Broomes not found in Railway (expected - he was deleted from HubSpot)');
      }
      
      console.log('\\n🎯 Railway CRM Status:');
      console.log(`✅ Total Contacts: ${stats.total}`);
      console.log(`✅ Cold Leads Found: ${coldLeads.length}`);
      console.log('✅ Cold Lead labeling system active');
      console.log('✅ Ready for deletion protection testing');
      
      console.log('\\n🔗 Access Railway CRM:');
      console.log('https://web-production-37634.up.railway.app/');
      
    } else {
      console.log('❌ Failed to get Railway statistics');
    }
    
  } catch (error) {
    console.error('❌ Error checking Railway sync progress:', error.message);
  }
}

// Run the check
if (require.main === module) {
  checkRailwaySyncProgress()
    .then(() => {
      console.log('\\n✅ Railway sync progress check complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Progress check failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkRailwaySyncProgress };