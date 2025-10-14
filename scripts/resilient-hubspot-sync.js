require('dotenv').config();
const mongoose = require('mongoose');
const hubspotService = require('../src/services/hubspotService');

async function resilientHubSpotSync() {
  try {
    console.log('🔄 === RESILIENT HUBSPOT SYNC ===');
    console.log('🛡️  This script will retry on API errors and handle failures gracefully');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    const currentTotal = await contactsCollection.countDocuments();
    console.log(`📊 Current contacts in database: ${currentTotal}`);
    
    let allContacts = [];
    let totalFetched = 0;
    let hasMore = true;
    let after = null;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 5000; // 5 seconds
    
    console.log('\n📡 Starting resilient contact fetch...');
    
    while (hasMore && retryCount < maxRetries) {
      try {
        console.log(`🔄 Fetching batch (after: ${after || 'start'})...`);
        
        const response = await hubspotService.getContacts(100, after);
        
        if (response.results && response.results.length > 0) {
          allContacts.push(...response.results);
          totalFetched += response.results.length;
          
          console.log(`✅ Fetched ${response.results.length} contacts (total: ${totalFetched})`);
          
          // Reset retry count on successful fetch
          retryCount = 0;
          
          // Check if there are more pages
          hasMore = response.paging && response.paging.next;
          after = hasMore ? response.paging.next.after : null;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } else {
          console.log('⚠️  Empty response, stopping fetch');
          hasMore = false;
        }
        
      } catch (error) {
        retryCount++;
        console.error(`❌ API Error (attempt ${retryCount}/${maxRetries}): ${error.message}`);
        
        if (retryCount >= maxRetries) {
          console.error('💥 Max retries reached, stopping sync');
          break;
        }
        
        console.log(`⏳ Waiting ${retryDelay/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    console.log(`\n📊 FETCH SUMMARY:`);
    console.log(`📋 Total contacts fetched: ${totalFetched}`);
    console.log(`📋 API retry attempts: ${retryCount}`);
    
    if (totalFetched === 0) {
      console.log('❌ No contacts fetched due to API issues');
      console.log('💡 Try again later when HubSpot API is stable');
      return;
    }
    
    if (totalFetched < 50000) {
      console.log('⚠️  WARNING: Fetched fewer contacts than expected');
      console.log('This might indicate API issues or incomplete data');
      console.log('Proceeding with caution...');
    }
    
    // Process contacts in batches
    console.log('\n🔄 Processing contacts...');
    const batchSize = 1000;
    let processed = 0;
    let created = 0;
    let updated = 0;
    
    for (let i = 0; i < allContacts.length; i += batchSize) {
      const batch = allContacts.slice(i, i + batchSize);
      
      try {
        const operations = [];
        
        for (const hubspotContact of batch) {
          const contactData = hubspotService.transformContactData(hubspotContact);
          
          operations.push({
            updateOne: {
              filter: { 
                source: 'hubspot',
                sourceId: contactData.sourceId 
              },
              update: { $set: contactData },
              upsert: true
            }
          });
        }
        
        const result = await contactsCollection.bulkWrite(operations, { ordered: false });
        
        created += result.upsertedCount;
        updated += result.modifiedCount;
        processed += batch.length;
        
        console.log(`✅ Processed batch ${Math.ceil((i + batchSize) / batchSize)}: ${batch.length} contacts`);
        
      } catch (error) {
        console.error(`❌ Error processing batch: ${error.message}`);
      }
    }
    
    // Final counts
    const finalTotal = await contactsCollection.countDocuments();
    const dncCount = await contactsCollection.countDocuments({ dncStatus: 'dnc_internal' });
    const callableCount = await contactsCollection.countDocuments({ 
      $or: [
        { dncStatus: 'callable' },
        { dncStatus: { $exists: false } },
        { dncStatus: null }
      ]
    });
    
    console.log(`\n🎯 SYNC RESULTS:`);
    console.log(`📊 Total contacts in database: ${finalTotal}`);
    console.log(`📈 Contacts processed: ${processed}`);
    console.log(`✨ New contacts created: ${created}`);
    console.log(`🔄 Existing contacts updated: ${updated}`);
    console.log(`🚫 DNC contacts: ${dncCount}`);
    console.log(`✅ Callable contacts: ${callableCount}`);
    
    // Update segment counts
    const segmentsCollection = db.collection('segments');
    
    await segmentsCollection.updateOne(
      { $or: [{ name: 'DNC - Do Not Call' }, { name: 'DNC - Do Not Call (Dynamic)' }] },
      { $set: { contactCount: dncCount, lastCountUpdate: new Date() } }
    );
    
    await segmentsCollection.updateOne(
      { $or: [{ name: 'Callable Contacts' }, { name: 'Callable Contacts (Dynamic)' }] },
      { $set: { contactCount: callableCount, lastCountUpdate: new Date() } }
    );
    
    console.log('✅ Updated segment counts');
    
    if (finalTotal > 100000) {
      console.log('🎉 SUCCESS! Contact database appears to be restored');
    } else {
      console.log('⚠️  Partial sync - may need to retry when API is stable');
    }
    
  } catch (error) {
    console.error('💥 Resilient sync failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run resilient sync
resilientHubSpotSync();