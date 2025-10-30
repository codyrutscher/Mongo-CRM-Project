require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

const RESPONSE_GENIUS_API_ID = process.env.RESPONSE_GENIUS_API_ID;
const RESPONSE_GENIUS_API_KEY = process.env.RESPONSE_GENIUS_API_KEY;
const RESPONSE_GENIUS_API_URL = process.env.RESPONSE_GENIUS_API_URL;

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

async function getResponseGeniusListCount(listId) {
  try {
    const response = await axios.get(`${RESPONSE_GENIUS_API_URL}/lists/get_list`, {
      params: {
        api_id: RESPONSE_GENIUS_API_ID,
        api_key: RESPONSE_GENIUS_API_KEY,
        list_api_identifier: listId
      }
    });
    
    return response.data?.list?.subscriber_count || 0;
  } catch (error) {
    console.error(`Error fetching list ${listId}:`, error.message);
    return 'ERROR';
  }
}

async function checkCounts() {
  try {
    console.log('🔍 Checking Response Genius vs Database Counts\n');
    console.log('Connecting to database...');
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('═'.repeat(80));
    console.log('LIST COMPARISON');
    console.log('═'.repeat(80));
    
    let totalDbCount = 0;
    let totalRgCount = 0;
    let totalMissing = 0;

    for (const [key, config] of Object.entries(lists)) {
      // Get database count
      const dbCount = await Contact.countDocuments({
        [config.property]: true,
        email: { $exists: true, $ne: null, $ne: '' }
      });
      
      // Get Response Genius count
      console.log(`\nFetching ${config.name} from Response Genius...`);
      const rgCount = await getResponseGeniusListCount(config.listId);
      
      const missing = typeof rgCount === 'number' ? dbCount - rgCount : '?';
      
      console.log(`\n${config.name}`);
      console.log(`  List ID: ${config.listId}`);
      console.log(`  Database: ${dbCount.toLocaleString()}`);
      console.log(`  Response Genius: ${typeof rgCount === 'number' ? rgCount.toLocaleString() : rgCount}`);
      console.log(`  Missing: ${typeof missing === 'number' ? missing.toLocaleString() : missing}`);
      
      if (typeof rgCount === 'number') {
        totalDbCount += dbCount;
        totalRgCount += rgCount;
        if (typeof missing === 'number') totalMissing += missing;
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('TOTALS');
    console.log('═'.repeat(80));
    console.log(`Database Total: ${totalDbCount.toLocaleString()}`);
    console.log(`Response Genius Total: ${totalRgCount.toLocaleString()}`);
    console.log(`Missing Total: ${totalMissing.toLocaleString()}`);
    
    if (totalMissing > 0) {
      console.log('\n⚠️  SYNC NEEDED: Run sync script to add missing contacts');
    } else {
      console.log('\n✅ All contacts are synced!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkCounts();
