require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const responseGeniusService = require('../src/services/responseGeniusService');

/**
 * Initial bulk sync of all Cold Leads to Response Genius
 * This should be run once to sync existing Cold Leads
 */

async function initialResponseGeniusSync() {
  console.log('=== Initial Response Genius Sync ===\n');

  try {
    // Connect to Railway database
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    console.log('✅ Connected to Railway database\n');

    // Check if Response Genius is configured
    const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
    if (!apiKey || apiKey === 'your_response_genius_api_key_here') {
      console.log('⚠️  Response Genius API key not configured');
      console.log('   Running in DRY RUN mode - no actual API calls will be made\n');
    }

    // Find all Cold Leads
    console.log('📋 Finding all Cold Leads...');
    const coldLeads = await Contact.find({
      tags: 'Cold Lead',
      status: 'active'
    });

    console.log(`Found ${coldLeads.length} Cold Leads to sync\n`);

    // Count by type
    const counts = {
      seller: 0,
      buyer: 0,
      cre: 0,
      exf: 0,
      total: coldLeads.length
    };

    coldLeads.forEach(contact => {
      const customFields = contact.customFields || {};
      if (customFields.sellerColdLead) counts.seller++;
      if (customFields.buyerColdLead) counts.buyer++;
      if (customFields.creColdLead) counts.cre++;
      if (customFields.exfColdLead) counts.exf++;
    });

    console.log('📊 Cold Leads by Type:');
    console.log(`   Seller: ${counts.seller.toLocaleString()}`);
    console.log(`   Buyer: ${counts.buyer.toLocaleString()}`);
    console.log(`   CRE: ${counts.cre.toLocaleString()}`);
    console.log(`   EXF: ${counts.exf.toLocaleString()}`);
    console.log(`   Total: ${counts.total.toLocaleString()}\n`);

    // Sync to Response Genius
    console.log('🔄 Starting bulk sync to Response Genius...\n');
    
    const results = {
      synced: 0,
      failed: 0,
      skipped: 0,
      byList: {
        seller: 0,
        buyer: 0,
        cre: 0,
        exf: 0
      }
    };

    for (let i = 0; i < coldLeads.length; i++) {
      const contact = coldLeads[i];
      
      try {
        const result = await responseGeniusService.syncColdLead(contact);
        
        if (result.success) {
          results.synced++;
          
          // Count by list
          if (result.syncedTo) {
            result.syncedTo.forEach(list => {
              if (results.byList[list] !== undefined) {
                results.byList[list]++;
              }
            });
          }
          
          if ((i + 1) % 100 === 0) {
            console.log(`   Synced ${i + 1}/${coldLeads.length} contacts...`);
          }
        } else {
          results.skipped++;
        }

        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.failed++;
        console.error(`   Error syncing ${contact.email}: ${error.message}`);
      }
    }

    console.log('\n=== Sync Complete ===');
    console.log(`✅ Successfully synced: ${results.synced.toLocaleString()}`);
    console.log(`⚠️  Skipped: ${results.skipped.toLocaleString()}`);
    console.log(`❌ Failed: ${results.failed.toLocaleString()}`);
    console.log('\n📊 Synced to Lists:');
    console.log(`   Seller DNC: ${results.byList.seller.toLocaleString()}`);
    console.log(`   Buyer DNC: ${results.byList.buyer.toLocaleString()}`);
    console.log(`   CRE DNC: ${results.byList.cre.toLocaleString()}`);
    console.log(`   EXF DNC: ${results.byList.exf.toLocaleString()}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

initialResponseGeniusSync();
