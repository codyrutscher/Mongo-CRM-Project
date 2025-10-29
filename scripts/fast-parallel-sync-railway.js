require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');
const hubspotService = require('../src/services/hubspotService');

const RAILWAY_MONGO_URI = process.env.RAILWAY_MONGODB_URI;
const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const BATCH_SIZE = 500; // Process 500 contacts at a time
const PARALLEL_BATCHES = 10; // Process 10 batches in parallel
const PARALLEL_FETCH = 10; // Fetch 10 pages from HubSpot in parallel

async function fetchHubSpotPage(after = null) {
  const params = {
    limit: 100,
    properties: 'firstname,lastname,email,phone,jobtitle,linkedin_profile_url,company,website,business_category___industry_of_interest,naics_code,numemployees,year_established,office_phone,address,city,state,zip,lead_source,contact_type,campaign_type,last_campaign_date,dnc___cre_outreach,dnc___exf_outreach,dnc___buyer_outreach,dnc___seller_outreach,exf_cold_lead,cre_cold_lead,buyer_cold_lead,seller_cold_lead,createdate,lastmodifieddate,lifecyclestage,annualrevenue,industry,account_type,broker,buyer_status,seller_status,currently_own_a_business,legal_organization_type,primary_investor_type,buying_role,motivation_for_buying,dnc_flag,optout,compliance_notes,hs_do_not_call,do_not_call'
  };
  
  if (after) params.after = after;

  const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
    headers: {
      'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    params
  });

  return response.data;
}

async function getAllContactsFast() {
  const allContacts = [];
  const afterTokens = [null]; // Start with first page
  let processedPages = 0;

  console.log('🚀 Fetching contacts from HubSpot in parallel...');

  while (afterTokens.length > 0) {
    // Fetch multiple pages in parallel
    const fetchPromises = afterTokens.splice(0, PARALLEL_FETCH).map(after => 
      fetchHubSpotPage(after).catch(err => {
        console.error('Error fetching page:', err.message);
        return null;
      })
    );

    const results = await Promise.all(fetchPromises);

    for (const data of results) {
      if (!data) continue;

      if (data.results) {
        allContacts.push(...data.results);
      }

      // Add next page token if available
      if (data.paging?.next?.after) {
        afterTokens.push(data.paging.next.after);
      }

      processedPages++;
      if (processedPages % 10 === 0) {
        console.log(`📥 Fetched ${allContacts.length} contacts (${processedPages} pages, ${afterTokens.length} pages queued)`);
      }
    }
  }

  console.log(`✅ Fetched ${allContacts.length} contacts from HubSpot`);
  return allContacts;
}

async function fastParallelSync() {
  try {
    console.log('🚂 Connecting to Railway MongoDB...');
    await mongoose.connect(RAILWAY_MONGO_URI);
    console.log('✅ Connected to Railway database');

    console.log('⚠️  FRESH SYNC: This will delete ALL contacts and resync from HubSpot');
    
    // Delete all existing contacts
    const deleteResult = await Contact.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} contacts`);

    const allContacts = await getAllContactsFast();

    // Transform HubSpot contacts to our Contact model format
    console.log('🔄 Transforming contacts...');
    const transformedContacts = allContacts.map(hubspotContact => 
      hubspotService.transformContactData(hubspotContact)
    );
    console.log(`✅ Transformed ${transformedContacts.length} contacts`);

    // Split into batches
    const batches = [];
    for (let i = 0; i < transformedContacts.length; i += BATCH_SIZE) {
      batches.push(transformedContacts.slice(i, i + BATCH_SIZE));
    }
    console.log(`📦 Split into ${batches.length} batches of ${BATCH_SIZE} contacts each`);
    console.log(`⚡ Processing ${PARALLEL_BATCHES} batches in parallel...`);

    // Process batches in parallel groups
    let processedCount = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
      const batchGroup = batches.slice(i, i + PARALLEL_BATCHES);
      
      await Promise.all(
        batchGroup.map(async (batch, batchIndex) => {
          const actualBatchIndex = i + batchIndex;
          try {
            await Contact.insertMany(batch, { ordered: false });
            processedCount += batch.length;
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = (processedCount / elapsed).toFixed(0);
            console.log(`✅ Batch ${actualBatchIndex + 1}/${batches.length}: Saved ${batch.length} contacts (Total: ${processedCount}/${allContacts.length}, ${rate}/sec)`);
          } catch (error) {
            if (error.code === 11000) {
              // Duplicate key errors - some contacts already exist
              const successCount = batch.length - (error.writeErrors?.length || 0);
              processedCount += successCount;
              console.log(`⚠️  Batch ${actualBatchIndex + 1}/${batches.length}: Saved ${successCount}/${batch.length} contacts (${error.writeErrors?.length || 0} duplicates skipped)`);
            } else {
              console.error(`❌ Batch ${actualBatchIndex + 1} error:`, error.message);
            }
          }
        })
      );
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  Database insert completed in ${totalTime} seconds`);

    console.log('\n✅ SYNC COMPLETE!');
    console.log(`📊 Total contacts synced: ${processedCount}/${transformedContacts.length}`);

    // Get final stats
    const stats = await Contact.aggregate([
      {
        $group: {
          _id: '$campaignType',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n📈 Campaign Type Breakdown:');
    stats.forEach(stat => {
      console.log(`   ${stat._id || 'No Campaign Type'}: ${stat.count}`);
    });

    const totalInDb = await Contact.countDocuments();
    console.log(`\n📊 Total contacts in Railway DB: ${totalInDb}`);

  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

fastParallelSync();
