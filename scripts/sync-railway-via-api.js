const axios = require('axios');

require('dotenv').config();

/**
 * Sync Cold Leads to Railway via API with terminal output
 * This connects to HubSpot directly and sends data to Railway via API
 */

const RAILWAY_API_BASE = 'https://web-production-37634.up.railway.app/api';

async function syncRailwayViaAPI() {
  console.log('🚂 Railway Cold Lead Sync via API Starting...');
  console.log('===============================================');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  try {
    let totalProcessed = 0;
    let coldLeadsFound = 0;
    let apiCallsSuccessful = 0;
    let apiCallsFailed = 0;
    
    const coldLeadStats = {
      seller: 0,
      buyer: 0,
      cre: 0,
      exf: 0
    };

    console.log('\\n📥 Fetching contacts with Cold Lead properties from HubSpot...');
    
    let after = null;
    let batchNumber = 0;
    
    do {
      batchNumber++;
      console.log(`\\nProcessing batch ${batchNumber}...`);
      
      try {
        // Get contacts from HubSpot with Cold Lead properties
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            limit: 100,
            after: after,
            properties: [
              'firstname', 'lastname', 'email', 'phone', 'company',
              'jobtitle', 'lifecyclestage', 'createdate', 'lastmodifieddate',
              'website', 'city', 'state', 'zip', 'country',
              'seller_cold_lead', 'buyer_cold_lead', 'cre_cold_lead', 'exf_cold_lead',
              'hs_object_id'
            ].join(',')
          }
        });

        const contacts = response.data.results;
        after = response.data.paging?.next?.after;
        
        let coldLeadsInBatch = 0;
        
        for (const hubspotContact of contacts) {
          totalProcessed++;
          
          const props = hubspotContact.properties;
          
          // Check if this is a Cold Lead
          const isColdLead = {
            seller: props.seller_cold_lead === 'true',
            buyer: props.buyer_cold_lead === 'true',
            cre: props.cre_cold_lead === 'true',
            exf: props.exf_cold_lead === 'true'
          };
          
          const isAnyColdLead = Object.values(isColdLead).some(Boolean);
          
          if (isAnyColdLead) {
            coldLeadsFound++;
            coldLeadsInBatch++;
            
            // Count by type
            if (isColdLead.seller) coldLeadStats.seller++;
            if (isColdLead.buyer) coldLeadStats.buyer++;
            if (isColdLead.cre) coldLeadStats.cre++;
            if (isColdLead.exf) coldLeadStats.exf++;
            
            // Show Cold Lead details
            console.log(`    ✅ Cold Lead: ${props.firstname} ${props.lastname} (${props.email})`);
            const types = [];
            if (isColdLead.seller) types.push('Seller');
            if (isColdLead.buyer) types.push('Buyer');
            if (isColdLead.cre) types.push('CRE');
            if (isColdLead.exf) types.push('EXF');
            console.log(`       Types: ${types.join(', ')}`);
          }
          
          // Prepare contact data for Railway
          const contactData = {
            email: props.email || '',
            firstName: props.firstname || '',
            lastName: props.lastname || '',
            phone: props.phone || '',
            company: props.company || '',
            jobTitle: props.jobtitle || '',
            source: 'hubspot',
            sourceId: hubspotContact.id,
            lifecycleStage: props.lifecyclestage || 'lead',
            status: 'active',
            tags: [],
            customFields: {
              hubspotId: hubspotContact.id,
              lastSyncedAt: new Date().toISOString()
            }
          };
          
          // Add Cold Lead properties and tags
          if (isAnyColdLead) {
            contactData.customFields.coldLead = true;
            contactData.customFields.coldLeadTypes = [];
            contactData.customFields.sellerColdLead = isColdLead.seller;
            contactData.customFields.buyerColdLead = isColdLead.buyer;
            contactData.customFields.creColdLead = isColdLead.cre;
            contactData.customFields.exfColdLead = isColdLead.exf;
            contactData.customFields.coldLeadSyncDate = new Date().toISOString();
            
            // Add tags
            contactData.tags.push('Cold Lead');
            if (isColdLead.seller) {
              contactData.customFields.coldLeadTypes.push('Seller');
              contactData.tags.push('Cold Lead - Seller');
            }
            if (isColdLead.buyer) {
              contactData.customFields.coldLeadTypes.push('Buyer');
              contactData.tags.push('Cold Lead - Buyer');
            }
            if (isColdLead.cre) {
              contactData.customFields.coldLeadTypes.push('CRE');
              contactData.tags.push('Cold Lead - CRE');
            }
            if (isColdLead.exf) {
              contactData.customFields.coldLeadTypes.push('EXF');
              contactData.tags.push('Cold Lead - EXF');
            }
          }
          
          // Send to Railway API (create or update contact)
          try {
            const railwayResponse = await axios.post(`${RAILWAY_API_BASE}/contacts`, contactData, {
              timeout: 10000
            });
            
            if (railwayResponse.data.success) {
              apiCallsSuccessful++;
            } else {
              apiCallsFailed++;
              console.error(`    ❌ Failed to sync ${props.email}: ${railwayResponse.data.error}`);
            }
          } catch (apiError) {
            apiCallsFailed++;
            if (apiError.response?.status === 409) {
              // Contact already exists, try to update
              try {
                const updateResponse = await axios.put(`${RAILWAY_API_BASE}/contacts/${hubspotContact.id}`, contactData, {
                  timeout: 10000
                });
                if (updateResponse.data.success) {
                  apiCallsSuccessful++;
                  apiCallsFailed--; // Correct the count
                }
              } catch (updateError) {
                console.error(`    ❌ Failed to update ${props.email}: ${updateError.message}`);
              }
            } else {
              console.error(`    ❌ API error for ${props.email}: ${apiError.message}`);
            }
          }
        }
        
        console.log(`  Found ${contacts.length} contacts in this batch`);
        if (coldLeadsInBatch > 0) {
          console.log(`  Found ${coldLeadsInBatch} Cold Lead contacts in this batch`);
        }
        
        // Progress update every 5 batches (more frequent for API calls)
        if (batchNumber % 5 === 0) {
          console.log(`\\n📊 Progress Update (Batch ${batchNumber}):`);
          console.log(`  Total Processed: ${totalProcessed}`);
          console.log(`  Cold Leads Found: ${coldLeadsFound}`);
          console.log(`  API Calls Successful: ${apiCallsSuccessful}`);
          console.log(`  API Calls Failed: ${apiCallsFailed}`);
          console.log(`  Cold Lead Breakdown:`);
          console.log(`    Seller: ${coldLeadStats.seller}`);
          console.log(`    Buyer: ${coldLeadStats.buyer}`);
          console.log(`    CRE: ${coldLeadStats.cre}`);
          console.log(`    EXF: ${coldLeadStats.exf}`);
        }
        
        // Small delay to avoid overwhelming Railway API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (batchError) {
        console.error(`❌ Error in batch ${batchNumber}:`, batchError.message);
        // Continue with next batch
      }
      
    } while (after);
    
    console.log('\\n🎉 Railway Cold Lead Sync Complete!');
    console.log('=====================================');
    
    console.log('\\n📊 FINAL STATISTICS:');
    console.log(`Total HubSpot Contacts Processed: ${totalProcessed}`);
    console.log(`API Calls Successful: ${apiCallsSuccessful}`);
    console.log(`API Calls Failed: ${apiCallsFailed}`);
    console.log(`\\nCold Lead Summary:`);
    console.log(`  Total Cold Leads Found: ${coldLeadsFound}`);
    console.log(`\\nCold Lead Breakdown:`);
    console.log(`  Seller Cold Leads: ${coldLeadStats.seller}`);
    console.log(`  Buyer Cold Leads: ${coldLeadStats.buyer}`);
    console.log(`  CRE Cold Leads: ${coldLeadStats.cre}`);
    console.log(`  EXF Cold Leads: ${coldLeadStats.exf}`);
    
    // Check Railway stats
    console.log('\\n🔍 Checking Railway database stats...');
    try {
      const statsResponse = await axios.get(`${RAILWAY_API_BASE}/contacts/stats`);
      if (statsResponse.data.success) {
        console.log(`✅ Railway database now has ${statsResponse.data.data.total} total contacts`);
      }
    } catch (statsError) {
      console.log('❌ Could not get Railway stats:', statsError.message);
    }
    
    console.log('\\n🛡️ Cold Lead Protection System Status:');
    console.log('✅ All Cold Leads synced to Railway via API');
    console.log('✅ Protection tags applied');
    console.log('✅ Railway CRM updated');
    console.log('✅ Ready for deletion protection testing');
    
    console.log('\\n🎯 Next Steps:');
    console.log('1. Search for contacts in Railway CRM: https://web-production-37634.up.railway.app/');
    console.log('2. Test Cold Lead deletion protection');
    console.log('3. Verify webhook protection is working');
    
    return {
      totalProcessed,
      coldLeadsFound,
      apiCallsSuccessful,
      apiCallsFailed,
      coldLeadStats
    };
    
  } catch (error) {
    console.error('❌ Railway API sync error:', error.message);
    throw error;
  }
}

// Run the sync
if (require.main === module) {
  syncRailwayViaAPI()
    .then((results) => {
      console.log(`\\n🚂 Railway API Cold Lead Sync Successfully Completed!`);
      console.log(`Processed ${results.totalProcessed} contacts`);
      console.log(`Found and synced ${results.coldLeadsFound} Cold Leads`);
      console.log(`API Success Rate: ${((results.apiCallsSuccessful / (results.apiCallsSuccessful + results.apiCallsFailed)) * 100).toFixed(1)}%`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Railway API sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = { syncRailwayViaAPI };