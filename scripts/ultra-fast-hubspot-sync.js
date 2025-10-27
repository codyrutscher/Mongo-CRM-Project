require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

async function ultraFastHubSpotSync() {
  try {
    console.log('🚀 === ULTRA FAST HUBSPOT SYNC ===');
    console.log('Using parallel requests and maximum batch sizes');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    const currentTotal = await contactsCollection.countDocuments();
    console.log(`📊 Current contacts in database: ${currentTotal}`);
    
    // Use only the most essential properties to avoid 500 errors
    const essentialProperties = 'firstname,lastname,email,phone,jobtitle,website,city,state,createdate,lastmodifieddate,lifecyclestage,dnc_flag,optout';
    
    let allContacts = [];
    let totalFetched = 0;
    let hasMore = true;
    let after = null;
    const concurrency = 5; // Number of parallel requests
    const batchSize = 100; // Max per request
    
    console.log('\n🚀 Starting ultra-fast parallel fetch...');
    const startTime = Date.now();
    
    while (hasMore) {
      try {
        // Create multiple parallel requests
        const promises = [];
        const currentAfters = [];
        
        for (let i = 0; i < concurrency && hasMore; i++) {
          currentAfters.push(after);
          
          const promise = axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
            headers: {
              'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            params: {
              properties: essentialProperties,
              limit: batchSize,
              after: after
            }
          });
          
          promises.push(promise);
          
          // For subsequent requests, we'll need to get the 'after' from previous responses
          // For now, we'll process them sequentially within the parallel batch
          if (i === 0) {
            try {
              const tempResponse = await promise;
              if (tempResponse.data.paging && tempResponse.data.paging.next) {
                after = tempResponse.data.paging.next.after;
              } else {
                hasMore = false;
                break;
              }
            } catch (error) {
              console.error(`❌ Error in temp request: ${error.response?.status}`);
              hasMore = false;
              break;
            }
          }
        }
        
        // Wait for all parallel requests to complete
        const responses = await Promise.allSettled(promises);
        
        let batchSuccess = false;
        for (let i = 0; i < responses.length; i++) {
          const response = responses[i];
          
          if (response.status === 'fulfilled' && response.value.data.results) {
            const contacts = response.value.data.results;
            allContacts.push(...contacts);
            totalFetched += contacts.length;
            batchSuccess = true;
            
            // Update hasMore based on the last successful response
            if (i === responses.length - 1) {
              hasMore = response.value.data.paging && response.value.data.paging.next;
              if (hasMore) {
                after = response.value.data.paging.next.after;
              }
            }
          } else if (response.status === 'rejected') {
            console.error(`❌ Request failed: ${response.reason.response?.status}`);
          }
        }
        
        if (!batchSuccess) {
          console.error('💥 All parallel requests failed, stopping');
          break;
        }
        
        // Progress update
        if (totalFetched % 1000 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = totalFetched / elapsed;
          console.log(`📊 Fetched ${totalFetched} contacts (${rate.toFixed(0)} contacts/sec)`);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`❌ Batch error: ${error.message}`);
        break;
      }
    }
    
    const fetchTime = (Date.now() - startTime) / 1000;
    console.log(`\n📊 FETCH COMPLETE:`);
    console.log(`📋 Total contacts fetched: ${totalFetched}`);
    console.log(`⏱️  Fetch time: ${fetchTime.toFixed(1)} seconds`);
    console.log(`🚀 Average rate: ${(totalFetched / fetchTime).toFixed(0)} contacts/second`);
    
    if (totalFetched === 0) {
      console.log('❌ No contacts fetched - API issues persist');
      return;
    }
    
    // Ultra-fast processing with mega-batches
    console.log('\n⚡ Processing contacts with mega-batches...');
    const processingStartTime = Date.now();
    const megaBatchSize = 5000; // Process 5000 at once
    let processed = 0;
    let created = 0;
    let updated = 0;
    
    for (let i = 0; i < allContacts.length; i += megaBatchSize) {
      const batch = allContacts.slice(i, i + megaBatchSize);
      
      try {
        const operations = [];
        
        for (const hubspotContact of batch) {
          const props = hubspotContact.properties;
          
          // Minimal transformation for speed
          const contactData = {
            firstName: props.firstname || '',
            lastName: props.lastname || '',
            email: props.email || '',
            phone: props.phone || '',
            jobTitle: props.jobtitle || '',
            website: props.website || '',
            address: {
              city: props.city || '',
              state: props.state || '',
              country: 'United States'
            },
            source: 'hubspot',
            sourceId: hubspotContact.id,
            lifecycleStage: mapLifecycleStage(props.lifecyclestage),
            
            // Fast DNC mapping
            dncStatus: (props.dnc_flag === 'true' || props.optout === 'true') ? 'dnc_internal' : 'callable',
            dncDate: (props.dnc_flag === 'true' || props.optout === 'true') ? new Date() : null,
            dncReason: (props.dnc_flag === 'true' || props.optout === 'true') ? 'Marked as DNC in HubSpot' : null,
            
            // Timestamps
            createdAt: props.createdate ? new Date(props.createdate) : new Date(),
            lastSyncedAt: new Date(),
            
            // Minimal defaults
            status: 'active',
            tags: (props.dnc_flag === 'true' || props.optout === 'true') ? ['DNC'] : [],
            customFields: {
              hubspotDoNotCall: props.dnc_flag || 'false',
              hubspotMarketingOptOut: props.optout || 'false'
            }
          };
          
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
        
        const result = await contactsCollection.bulkWrite(operations, { 
          ordered: false,
          writeConcern: { w: 1, j: false } // Faster write concern
        });
        
        created += result.upsertedCount;
        updated += result.modifiedCount;
        processed += batch.length;
        
        const batchNum = Math.ceil((i + megaBatchSize) / megaBatchSize);
        const totalBatches = Math.ceil(allContacts.length / megaBatchSize);
        console.log(`⚡ Mega-batch ${batchNum}/${totalBatches}: ${batch.length} contacts processed`);
        
      } catch (error) {
        console.error(`❌ Error processing mega-batch: ${error.message}`);
      }
    }
    
    const processingTime = (Date.now() - processingStartTime) / 1000;
    const totalTime = (Date.now() - startTime) / 1000;
    
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
    
    console.log(`\n🎯 ULTRA-FAST SYNC RESULTS:`);
    console.log(`📊 Total contacts in database: ${finalTotal}`);
    console.log(`📈 Contacts processed: ${processed}`);
    console.log(`✨ New contacts created: ${created}`);
    console.log(`🔄 Existing contacts updated: ${updated}`);
    console.log(`🚫 DNC contacts: ${dncCount}`);
    console.log(`✅ Callable contacts: ${callableCount}`);
    console.log(`⏱️  Processing time: ${processingTime.toFixed(1)} seconds`);
    console.log(`⏱️  Total time: ${totalTime.toFixed(1)} seconds`);
    console.log(`🚀 Overall rate: ${(processed / totalTime).toFixed(0)} contacts/second`);
    
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
      console.log('🎉 SUCCESS! Contact database restored at ultra-high speed!');
    } else {
      console.log(`⚠️  Partial restore: ${finalTotal} contacts (expected ~135K)`);
    }
    
  } catch (error) {
    console.error('💥 Ultra-fast sync failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Helper function
function mapLifecycleStage(hubspotStage) {
  const stageMap = {
    'subscriber': 'lead',
    'lead': 'lead', 
    'marketingqualifiedlead': 'prospect',
    'salesqualifiedlead': 'prospect',
    'opportunity': 'prospect',
    'customer': 'customer',
    'evangelist': 'evangelist'
  };
  
  return stageMap[hubspotStage] || 'lead';
}

// Run ultra-fast sync
ultraFastHubSpotSync();