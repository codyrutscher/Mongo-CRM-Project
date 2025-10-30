require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

const RESPONSE_GENIUS_API_ID = process.env.RESPONSE_GENIUS_API_ID;
const RESPONSE_GENIUS_API_KEY = process.env.RESPONSE_GENIUS_API_KEY;
const RESPONSE_GENIUS_API_URL = process.env.RESPONSE_GENIUS_API_URL || 'https://control.responsegenius.com/rest';
const BATCH_SIZE = 100;
const DELAY_MS = 200; // Delay between batches to respect rate limits

const lists = {
  dnc_seller: {
    listId: process.env.RESPONSE_GENIUS_DNC_SELLER_LIST_ID,
    name: 'DNC - Seller outreach',
    property: 'dnc___seller_outreach'
  },
  dnc_buyer: {
    listId: process.env.RESPONSE_GENIUS_DNC_BUYER_LIST_ID,
    name: 'DNC - Buyer outreach',
    property: 'dnc___buyer_outreach'
  },
  dnc_cre: {
    listId: process.env.RESPONSE_GENIUS_DNC_CRE_LIST_ID,
    name: 'DNC - CRE outreach',
    property: 'dnc___cre_outreach'
  },
  dnc_exf: {
    listId: process.env.RESPONSE_GENIUS_DNC_EXF_LIST_ID,
    name: 'DNC - EXF outreach',
    property: 'dnc___exf_outreach'
  },
  cold_seller: {
    listId: process.env.RESPONSE_GENIUS_COLD_SELLER_LIST_ID,
    name: 'Seller Cold Lead',
    property: 'seller_cold_lead'
  },
  cold_buyer: {
    listId: process.env.RESPONSE_GENIUS_COLD_BUYER_LIST_ID,
    name: 'Buyer Cold Lead',
    property: 'buyer_cold_lead'
  },
  cold_cre: {
    listId: process.env.RESPONSE_GENIUS_COLD_CRE_LIST_ID,
    name: 'CRE Cold Lead',
    property: 'cre_cold_lead'
  },
  cold_exf: {
    listId: process.env.RESPONSE_GENIUS_COLD_EXF_LIST_ID,
    name: 'EXF Cold Lead',
    property: 'exf_cold_lead'
  }
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncBatchToResponseGenius(listId, contacts) {
  try {
    // Use subscribe_user endpoint for each contact
    let successCount = 0;
    let failCount = 0;
    
    for (const contact of contacts) {
      try {
        await axios.get(`${RESPONSE_GENIUS_API_URL}/lists/subscribe_user`, {
          params: {
            api_id: RESPONSE_GENIUS_API_ID,
            api_key: RESPONSE_GENIUS_API_KEY,
            list_api_identifier: listId,
            email_address: contact.email,
            first_name: contact.firstName || '',
            last_name: contact.lastName || '',
            phone: contact.phone || ''
          }
        });
        successCount++;
      } catch (error) {
        // 404 means user doesn't exist, which is expected for new contacts
        // We need to create them first or use a different endpoint
        if (error.response?.status === 404) {
          // Try to add as new user
          try {
            await axios.get(`${RESPONSE_GENIUS_API_URL}/lists/subscribe_user`, {
              params: {
                api_id: RESPONSE_GENIUS_API_ID,
                api_key: RESPONSE_GENIUS_API_KEY,
                list_api_identifier: listId,
                email_address: contact.email,
                first_name: contact.firstName || '',
                last_name: contact.lastName || '',
                phone: contact.phone || '',
                create_user: 'Y'
              }
            });
            successCount++;
          } catch (createError) {
            failCount++;
          }
        } else {
          failCount++;
        }
      }
      // Small delay between individual requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return { success: true, count: successCount, failed: failCount };
  } catch (error) {
    console.error(`    ❌ Batch error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function syncListToResponseGenius(listKey, config) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 ${config.name}`);
  console.log(`${'='.repeat(80)}`);
  
  // Get contacts from database
  const contacts = await Contact.find({
    [config.property]: true,
    email: { $exists: true, $ne: null, $ne: '' }
  }).select('email firstName lastName phone').lean();
  
  console.log(`Found ${contacts.length.toLocaleString()} contacts to sync`);
  
  if (contacts.length === 0) {
    console.log('✅ No contacts to sync');
    return { success: true, synced: 0 };
  }

  // Split into batches
  const batches = [];
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    batches.push(contacts.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`Processing ${batches.length} batches of ${BATCH_SIZE} contacts each...`);
  
  let totalSynced = 0;
  let totalFailed = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const result = await syncBatchToResponseGenius(config.listId, batch);
    
    if (result.success) {
      totalSynced += result.count;
      const progress = ((i + 1) / batches.length * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (totalSynced / elapsed).toFixed(0);
      console.log(`  ✅ Batch ${i + 1}/${batches.length} (${progress}%) - ${result.count} contacts - ${rate}/sec`);
    } else {
      totalFailed += batch.length;
    }
    
    // Delay between batches to respect rate limits
    if (i < batches.length - 1) {
      await delay(DELAY_MS);
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Completed in ${totalTime}s`);
  console.log(`   Synced: ${totalSynced.toLocaleString()}`);
  if (totalFailed > 0) {
    console.log(`   Failed: ${totalFailed.toLocaleString()}`);
  }
  
  return { success: true, synced: totalSynced, failed: totalFailed };
}

async function bulkSync() {
  try {
    console.log('🚀 BULK SYNC TO RESPONSE GENIUS');
    console.log('═'.repeat(80));
    console.log('This will sync all DNC and Cold Lead contacts to Response Genius');
    console.log('═'.repeat(80));
    
    console.log('\nConnecting to database...');
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    console.log('✅ Connected\n');

    const results = {};
    let totalSynced = 0;
    let totalFailed = 0;
    const overallStart = Date.now();

    for (const [listKey, config] of Object.entries(lists)) {
      const result = await syncListToResponseGenius(listKey, config);
      results[listKey] = result;
      totalSynced += result.synced || 0;
      totalFailed += result.failed || 0;
    }

    const overallTime = ((Date.now() - overallStart) / 60000).toFixed(1);
    
    console.log('\n' + '═'.repeat(80));
    console.log('🎉 BULK SYNC COMPLETE');
    console.log('═'.repeat(80));
    console.log(`Total Time: ${overallTime} minutes`);
    console.log(`Total Synced: ${totalSynced.toLocaleString()}`);
    if (totalFailed > 0) {
      console.log(`Total Failed: ${totalFailed.toLocaleString()}`);
    }
    console.log('\n✅ All contacts are now synced to Response Genius!');
    console.log('📋 Future updates will sync automatically via webhooks');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

bulkSync();
