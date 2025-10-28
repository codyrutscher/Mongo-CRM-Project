require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const hubspotService = require('../src/services/hubspotService');

const RAILWAY_MONGO_URI = process.env.RAILWAY_MONGO_URI;
const BATCH_SIZE = 500; // Process 500 contacts at a time
const PARALLEL_BATCHES = 5; // Process 5 batches in parallel

async function fastParallelSync() {
  try {
    console.log('🚂 Connecting to Railway MongoDB...');
    await mongoose.connect(RAILWAY_MONGO_URI);
    console.log('✅ Connected to Railway database');

    console.log('⚠️  FRESH SYNC: This will delete ALL contacts and resync from HubSpot');
    
    // Delete all existing contacts
    const deleteResult = await Contact.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} contacts`);

    console.log('📥 Fetching ALL contacts from HubSpot...');
    const allContacts = await hubspotService.getAllContacts();
    console.log(`✅ Fetched ${allContacts.length} contacts from HubSpot`);

    // Split into batches
    const batches = [];
    for (let i = 0; i < allContacts.length; i += BATCH_SIZE) {
      batches.push(allContacts.slice(i, i + BATCH_SIZE));
    }
    console.log(`📦 Split into ${batches.length} batches of ${BATCH_SIZE} contacts each`);

    // Process batches in parallel groups
    let processedCount = 0;
    for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
      const batchGroup = batches.slice(i, i + PARALLEL_BATCHES);
      
      await Promise.all(
        batchGroup.map(async (batch, batchIndex) => {
          const actualBatchIndex = i + batchIndex;
          try {
            await Contact.insertMany(batch, { ordered: false });
            processedCount += batch.length;
            console.log(`✅ Batch ${actualBatchIndex + 1}/${batches.length}: Saved ${batch.length} contacts (Total: ${processedCount}/${allContacts.length})`);
          } catch (error) {
            if (error.code === 11000) {
              // Duplicate key errors - some contacts already exist
              const successCount = batch.length - error.writeErrors.length;
              processedCount += successCount;
              console.log(`⚠️  Batch ${actualBatchIndex + 1}/${batches.length}: Saved ${successCount}/${batch.length} contacts (${error.writeErrors.length} duplicates skipped)`);
            } else {
              console.error(`❌ Batch ${actualBatchIndex + 1} error:`, error.message);
            }
          }
        })
      );
    }

    console.log('\n✅ SYNC COMPLETE!');
    console.log(`📊 Total contacts synced: ${processedCount}`);

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
