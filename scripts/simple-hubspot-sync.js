require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

async function simpleHubSpotSync() {
  try {
    console.log('🔄 === SIMPLE HUBSPOT SYNC ===');
    console.log('Using only basic properties to avoid API errors');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    const currentTotal = await contactsCollection.countDocuments();
    console.log(`📊 Current contacts in database: ${currentTotal}`);
    
    // Use minimal, standard HubSpot properties
    const basicProperties = [
      'firstname', 'lastname', 'email', 'phone', 'company', 
      'jobtitle', 'website', 'city', 'state', 'country',
      'createdate', 'lastmodifieddate', 'lifecyclestage',
      'do_not_call', 'hs_email_optout'
    ].join(',');
    
    let allContacts = [];
    let totalFetched = 0;
    let hasMore = true;
    let after = null;
    let pageCount = 0;
    
    console.log('\n📡 Fetching contacts with basic properties...');
    
    while (hasMore) {
      try {
        const url = 'https://api.hubapi.com/crm/v3/objects/contacts';
        const params = {
          properties: basicProperties,
          limit: 100
        };
        
        if (after) {
          params.after = after;
        }
        
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params: params
        });
        
        if (response.data.results && response.data.results.length > 0) {
          allContacts.push(...response.data.results);
          totalFetched += response.data.results.length;
          pageCount++;
          
          if (pageCount % 10 === 0) {
            console.log(`📊 Fetched ${totalFetched} contacts so far...`);
          }
          
          // Check for more pages
          hasMore = response.data.paging && response.data.paging.next;
          after = hasMore ? response.data.paging.next.after : null;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } else {
          console.log('⚠️  Empty response, stopping fetch');
          hasMore = false;
        }
        
      } catch (error) {
        console.error(`❌ API Error: ${error.response?.status} - ${error.message}`);
        
        if (error.response?.status === 429) {
          console.log('⏳ Rate limited, waiting 10 seconds...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          continue;
        }
        
        console.error('💥 Stopping sync due to API error');
        break;
      }
    }
    
    console.log(`\n📊 FETCH COMPLETE:`);
    console.log(`📋 Total contacts fetched: ${totalFetched}`);
    
    if (totalFetched === 0) {
      console.log('❌ No contacts fetched - API issues persist');
      return;
    }
    
    // Transform and save contacts
    console.log('\n🔄 Processing and saving contacts...');
    const batchSize = 1000;
    let processed = 0;
    let created = 0;
    let updated = 0;
    
    for (let i = 0; i < allContacts.length; i += batchSize) {
      const batch = allContacts.slice(i, i + batchSize);
      
      try {
        const operations = [];
        
        for (const hubspotContact of batch) {
          const props = hubspotContact.properties;
          
          // Transform to our format
          const contactData = {
            firstName: props.firstname || '',
            lastName: props.lastname || '',
            email: props.email || '',
            phone: props.phone || '',
            company: props.company || '',
            jobTitle: props.jobtitle || '',
            website: props.website || '',
            address: {
              city: props.city || '',
              state: props.state || '',
              country: props.country || 'United States'
            },
            source: 'hubspot',
            sourceId: hubspotContact.id,
            lifecycleStage: mapLifecycleStage(props.lifecyclestage),
            
            // DNC Status
            dncStatus: mapDncStatus(props.do_not_call, props.hs_email_optout),
            dncDate: null,
            dncReason: null,
            
            // Timestamps
            createdAt: props.createdate ? new Date(props.createdate) : new Date(),
            lastSyncedAt: new Date(),
            
            // Default values
            status: 'active',
            tags: [],
            customFields: {
              hubspotDoNotCall: props.do_not_call || 'false',
              hubspotMarketingOptOut: props.hs_email_optout || 'false'
            }
          };
          
          // Set DNC fields if contact is DNC
          if (contactData.dncStatus === 'dnc_internal') {
            contactData.dncDate = new Date();
            contactData.dncReason = 'Marked as DNC in HubSpot';
            contactData.tags.push('DNC');
          }
          
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
      console.log('🎉 SUCCESS! Contact database restored');
    } else {
      console.log(`⚠️  Partial restore: ${finalTotal} contacts (expected ~135K)`);
    }
    
  } catch (error) {
    console.error('💥 Simple sync failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Helper functions
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

function mapDncStatus(doNotCall, emailOptout) {
  if (doNotCall === 'true' || doNotCall === true || doNotCall === 'Yes') {
    return 'dnc_internal';
  }
  
  if (emailOptout === 'true' || emailOptout === true) {
    return 'dnc_internal';
  }
  
  return 'callable';
}

// Run simple sync
simpleHubSpotSync();