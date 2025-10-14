require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

async function speedSync() {
  try {
    console.log('⚡ === SPEED SYNC ===');
    console.log('Maximum speed with minimal properties and mega-batches');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    // Use absolute minimum properties to avoid any API issues
    const minimalProps = 'firstname,lastname,email,dnc_flag,optout,createdate';
    
    let allContacts = [];
    let totalFetched = 0;
    let hasMore = true;
    let after = null;
    let pageCount = 0;
    
    console.log('\n⚡ Fetching with minimal properties for maximum speed...');
    const startTime = Date.now();
    
    while (hasMore) {
      try {
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params: {
            properties: minimalProps,
            limit: 100
          },
          ...(after && { params: { ...{ properties: minimalProps, limit: 100 }, after } })
        });
        
        if (response.data.results && response.data.results.length > 0) {
          allContacts.push(...response.data.results);
          totalFetched += response.data.results.length;
          pageCount++;
          
          // Super fast progress updates
          if (pageCount % 50 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = totalFetched / elapsed;
            console.log(`⚡ ${totalFetched} contacts (${rate.toFixed(0)}/sec)`);
          }
          
          hasMore = response.data.paging && response.data.paging.next;
          after = hasMore ? response.data.paging.next.after : null;
          
          // Minimal delay for maximum speed
          await new Promise(resolve => setTimeout(resolve, 10));
          
        } else {
          hasMore = false;
        }
        
      } catch (error) {
        console.error(`❌ Error at page ${pageCount}: ${error.response?.status}`);
        
        if (error.response?.status === 429) {
          console.log('⏳ Rate limited, waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        
        console.error('💥 Stopping due to API error');
        break;
      }
    }
    
    const fetchTime = (Date.now() - startTime) / 1000;
    console.log(`\n📊 FETCH COMPLETE:`);
    console.log(`📋 Fetched: ${totalFetched} contacts`);
    console.log(`⏱️  Time: ${fetchTime.toFixed(1)}s`);
    console.log(`🚀 Rate: ${(totalFetched / fetchTime).toFixed(0)} contacts/sec`);
    
    if (totalFetched === 0) {
      console.log('❌ No contacts fetched');
      return;
    }
    
    // Ultra-mega-batch processing
    console.log('\n⚡ Ultra-mega-batch processing...');
    const processingStart = Date.now();
    const ultraBatchSize = 10000; // 10K at once!
    let processed = 0;
    let created = 0;
    let updated = 0;
    
    for (let i = 0; i < allContacts.length; i += ultraBatchSize) {
      const batch = allContacts.slice(i, i + ultraBatchSize);
      
      try {
        const operations = batch.map(contact => {
          const props = contact.properties;
          const isDNC = props.dnc_flag === 'true' || props.optout === 'true';
          
          return {
            updateOne: {
              filter: { source: 'hubspot', sourceId: contact.id },
              update: { 
                $set: {
                  firstName: props.firstname || '',
                  lastName: props.lastname || '',
                  email: props.email || '',
                  source: 'hubspot',
                  sourceId: contact.id,
                  dncStatus: isDNC ? 'dnc_internal' : 'callable',
                  dncDate: isDNC ? new Date() : null,
                  dncReason: isDNC ? 'DNC in HubSpot' : null,
                  createdAt: props.createdate ? new Date(props.createdate) : new Date(),
                  lastSyncedAt: new Date(),
                  status: 'active',
                  tags: isDNC ? ['DNC'] : [],
                  customFields: {
                    hubspotDoNotCall: props.dnc_flag || 'false'
                  }
                }
              },
              upsert: true
            }
          };
        });
        
        const result = await contactsCollection.bulkWrite(operations, { 
          ordered: false,
          writeConcern: { w: 0 } // Fastest possible write
        });
        
        created += result.upsertedCount || 0;
        updated += result.modifiedCount || 0;
        processed += batch.length;
        
        const batchNum = Math.ceil((i + ultraBatchSize) / ultraBatchSize);
        const totalBatches = Math.ceil(allContacts.length / ultraBatchSize);
        console.log(`⚡ Ultra-batch ${batchNum}/${totalBatches}: ${batch.length} contacts`);
        
      } catch (error) {
        console.error(`❌ Batch error: ${error.message}`);
      }
    }
    
    // Force write completion
    await contactsCollection.createIndex({ sourceId: 1 }, { background: true });
    
    const processingTime = (Date.now() - processingStart) / 1000;
    const totalTime = (Date.now() - startTime) / 1000;
    
    // Quick final counts
    const finalTotal = await contactsCollection.countDocuments();
    const dncCount = await contactsCollection.countDocuments({ dncStatus: 'dnc_internal' });
    
    console.log(`\n🎯 SPEED SYNC COMPLETE:`);
    console.log(`📊 Total: ${finalTotal} contacts`);
    console.log(`🚫 DNC: ${dncCount} contacts`);
    console.log(`✅ Callable: ${finalTotal - dncCount} contacts`);
    console.log(`⏱️  Processing: ${processingTime.toFixed(1)}s`);
    console.log(`⏱️  Total: ${totalTime.toFixed(1)}s`);
    console.log(`🚀 Speed: ${(processed / totalTime).toFixed(0)} contacts/sec`);
    
    // Quick segment update
    const segmentsCollection = db.collection('segments');
    await Promise.all([
      segmentsCollection.updateOne(
        { $or: [{ name: 'DNC - Do Not Call' }, { name: 'DNC - Do Not Call (Dynamic)' }] },
        { $set: { contactCount: dncCount, lastCountUpdate: new Date() } }
      ),
      segmentsCollection.updateOne(
        { $or: [{ name: 'Callable Contacts' }, { name: 'Callable Contacts (Dynamic)' }] },
        { $set: { contactCount: finalTotal - dncCount, lastCountUpdate: new Date() } }
      )
    ]);
    
    console.log('✅ Segments updated');
    
    if (finalTotal > 100000) {
      console.log('🎉 SUCCESS! Ultra-fast restore complete!');
    }
    
  } catch (error) {
    console.error('💥 Speed sync failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Done');
  }
}

speedSync();