require('dotenv').config();
const mongoose = require('mongoose');
const hubspotService = require('../src/services/hubspotService');
const Contact = require('../src/models/Contact');

const MEGA_BATCH_SIZE = 5000; // Ultra-fast batches

async function fastHubSpotFullSync() {
  try {
    console.log('⚡ === FAST HUBSPOT FULL SYNC ===');
    console.log('🚀 Using mega-batches and bulk operations for maximum speed');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get current HubSpot contact count in database
    const currentCount = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`📊 Current HubSpot contacts in database: ${currentCount}`);
    
    // Fetch ALL contacts from HubSpot with business fields AND DNC status
    console.log('📄 Fetching ALL HubSpot contacts with business fields and DNC status...');
    const allHubSpotContacts = await hubspotService.getAllContacts();
    console.log(`📈 Total contacts in HubSpot: ${allHubSpotContacts.length}`);
    
    if (allHubSpotContacts.length === 0) {
      console.log('❌ No contacts found in HubSpot');
      return;
    }
    
    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    // Process in mega-batches for maximum speed
    for (let i = 0; i < allHubSpotContacts.length; i += MEGA_BATCH_SIZE) {
      const batch = allHubSpotContacts.slice(i, i + MEGA_BATCH_SIZE);
      console.log(`⚡ MEGA-BATCH ${Math.floor(i / MEGA_BATCH_SIZE) + 1}/${Math.ceil(allHubSpotContacts.length / MEGA_BATCH_SIZE)} (${batch.length} contacts)...`);
      
      // Prepare bulk operations
      const bulkOps = [];
      
      for (const hubspotContact of batch) {
        try {
          const contactData = hubspotService.transformContactData(hubspotContact);
          
          // Use upsert operation for speed (update if exists, create if not)
          bulkOps.push({
            updateOne: {
              filter: { 
                source: 'hubspot', 
                sourceId: contactData.sourceId 
              },
              update: { $set: contactData },
              upsert: true
            }
          });
          
        } catch (error) {
          errors++;
          if (errors <= 10) {
            console.error(`❌ Error processing contact:`, error.message);
          }
        }
      }
      
      // Execute bulk operation for maximum speed
      if (bulkOps.length > 0) {
        try {
          const result = await Contact.bulkWrite(bulkOps, { ordered: false });
          
          created += result.upsertedCount || 0;
          updated += result.modifiedCount || 0;
          processed += bulkOps.length;
          
          console.log(`   ⚡ Batch completed: ${result.upsertedCount || 0} created | ${result.modifiedCount || 0} updated | ${errors} errors`);
          
        } catch (bulkError) {
          console.error(`   ❌ Bulk operation failed:`, bulkError.message);
          errors += bulkOps.length;
        }
      }
    }
    
    console.log('\n🎉 FAST HUBSPOT SYNC COMPLETED!');
    console.log(`📈 Total processed: ${processed}`);
    console.log(`✨ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`⚡ Speed: ~${Math.round(processed / ((Date.now() - startTime) / 1000))} contacts/second`);
    
    // Get final stats
    const finalStats = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`🎯 Total HubSpot contacts in database: ${finalStats}`);
    
    // Test business field population
    const businessFieldsTest = await Contact.aggregate([
      { $match: { source: 'hubspot' } },
      {
        $group: {
          _id: null,
          hasBusinessCategory: { $sum: { $cond: [{ $ne: ['$customFields.businessCategory', ''] }, 1, 0] } },
          hasContactType: { $sum: { $cond: [{ $ne: ['$customFields.contactType', ''] }, 1, 0] } },
          hasIndustry: { $sum: { $cond: [{ $ne: ['$customFields.industry', ''] }, 1, 0] } },
          hasAnnualRevenue: { $sum: { $cond: [{ $ne: ['$customFields.annualRevenue', ''] }, 1, 0] } },
          hasAccountType: { $sum: { $cond: [{ $ne: ['$customFields.accountType', ''] }, 1, 0] } }
        }
      }
    ]);
    
    console.log('\n📊 === BUSINESS FIELDS POPULATION ===');
    if (businessFieldsTest.length > 0) {
      const stats = businessFieldsTest[0];
      console.log(`📋 Business Category: ${stats.hasBusinessCategory} contacts`);
      console.log(`👤 Contact Type: ${stats.hasContactType} contacts`);
      console.log(`🏭 Industry: ${stats.hasIndustry} contacts`);
      console.log(`💰 Annual Revenue: ${stats.hasAnnualRevenue} contacts`);
      console.log(`🏢 Account Type: ${stats.hasAccountType} contacts`);
    }
    
    console.log('\n💡 === NEXT STEPS ===');
    console.log('1. Test filtering by business category');
    console.log('2. Test filtering by contact type (Buyer/Seller)');
    console.log('3. Update filter dropdowns with actual values');
    console.log('4. Create campaign segments with business intelligence');
    
  } catch (error) {
    console.error('💥 Fast sync failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Track start time for speed calculation
const startTime = Date.now();

// Run the fast sync
fastHubSpotFullSync();