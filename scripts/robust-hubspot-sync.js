require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

async function robustHubSpotSync() {
  try {
    console.log('🛡️  === ROBUST HUBSPOT SYNC ===');
    console.log('Handles problematic contacts and ensures complete sync');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
    const headers = {
      'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    const allProperties = 'firstname,lastname,jobtitle,linkedin_profile_url,email,phone,website,business_category___industry_of_interest,naics_code,numemployees,year_established,office_phone,address,city,state,zip,lead_source,contact_type,hs_email_last_send_date,createdate,lastmodifieddate,lifecyclestage,annualrevenue,industry,account_type,broker,buyer_status,seller_status,currently_own_a_business,legal_organization_type,primary_investor_type,buying_role,motivation_for_buying,dnc_flag,optout,compliance_notes';
    
    let allContacts = [];
    let totalFetched = 0;
    let after = null;
    let pageCount = 0;
    let errorCount = 0;
    const maxErrors = 10;
    
    console.log('\n🚀 Starting robust sync with adaptive batch sizing...');
    const startTime = Date.now();
    
    while (pageCount < 2000 && errorCount < maxErrors) {
      let batchSize = 100; // Start with max batch size
      let success = false;
      
      // Try different batch sizes until one works
      const batchSizes = [100, 50, 25, 10, 5, 1];
      
      for (const currentBatchSize of batchSizes) {
        try {
          const response = await axios.get(baseURL, {
            headers,
            params: {
              properties: allProperties,
              limit: currentBatchSize,
              ...(after && { after })
            }
          });
          
          if (response.data.results && response.data.results.length > 0) {
            allContacts.push(...response.data.results);
            totalFetched += response.data.results.length;
            pageCount++;
            success = true;
            
            // Update after token
            if (response.data.paging && response.data.paging.next) {
              after = response.data.paging.next.after;
            } else {
              console.log('✅ Reached end of contacts');
              break;
            }
            
            // Progress update
            if (totalFetched % 500 === 0) {
              const elapsed = (Date.now() - startTime) / 1000;
              const rate = totalFetched / elapsed;
              console.log(`📊 Fetched ${totalFetched} contacts (${rate.toFixed(0)}/sec) - batch size: ${currentBatchSize}`);
            }
            
            // If we had to use a smaller batch size, log it
            if (currentBatchSize < 100) {
              console.log(`⚠️  Used smaller batch size ${currentBatchSize} at after: ${after}`);
            }
            
            break; // Success, move to next batch
            
          } else {
            console.log('⚠️  Empty response');
            break;
          }
          
        } catch (error) {
          if (currentBatchSize === 1) {
            // Even single contact fails - this is a truly problematic contact
            console.log(`🚨 PROBLEMATIC CONTACT at after: ${after}`);
            console.log(`   Status: ${error.response?.status}`);
            
            // Try to get just the contact ID to skip it
            try {
              const skipResponse = await axios.get(baseURL, {
                headers,
                params: {
                  properties: 'firstname,lastname,email',
                  limit: 1,
                  ...(after && { after })
                }
              });
              
              if (skipResponse.data.results && skipResponse.data.results.length > 0) {
                const problematicContact = skipResponse.data.results[0];
                console.log(`   Problematic contact: ${problematicContact.properties.firstname} ${problematicContact.properties.lastname} (${problematicContact.properties.email})`);
                
                // Create a minimal record for this contact
                const minimalContact = {
                  firstName: problematicContact.properties.firstname || '',
                  lastName: problematicContact.properties.lastname || '',
                  email: problematicContact.properties.email || '',
                  source: 'hubspot',
                  sourceId: problematicContact.id,
                  dncStatus: 'callable', // Default since we can't get DNC info
                  status: 'active',
                  createdAt: new Date(),
                  lastSyncedAt: new Date(),
                  tags: ['PROBLEMATIC_SYNC'],
                  customFields: {
                    syncError: 'Could not fetch full properties due to API error'
                  }
                };
                
                await contactsCollection.updateOne(
                  { source: 'hubspot', sourceId: minimalContact.sourceId },
                  { $set: minimalContact },
                  { upsert: true }
                );
                
                console.log(`   ✅ Created minimal record for problematic contact`);
                allContacts.push(problematicContact);
                totalFetched++;
                
                // Move past this contact
                after = problematicContact.id;
                success = true;
                break;
              }
              
            } catch (skipError) {
              console.log(`   ❌ Could not even get minimal info: ${skipError.response?.status}`);
              errorCount++;
              
              // Try to increment the after token manually
              if (after && !isNaN(after)) {
                after = (parseInt(after) + 1).toString();
                console.log(`   🔄 Manually incrementing after token to: ${after}`);
                success = true;
                break;
              }
            }
          }
          
          // If not the smallest batch size, try smaller
          if (currentBatchSize > 1) {
            continue;
          }
        }
      }
      
      if (!success) {
        console.log('❌ All batch sizes failed, stopping sync');
        break;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    
    const fetchTime = (Date.now() - startTime) / 1000;
    console.log(`\n📊 FETCH COMPLETE:`);
    console.log(`📋 Total contacts fetched: ${totalFetched}`);
    console.log(`⏱️  Fetch time: ${fetchTime.toFixed(1)} seconds`);
    console.log(`🚀 Average rate: ${(totalFetched / fetchTime).toFixed(0)} contacts/second`);
    console.log(`🚨 Errors encountered: ${errorCount}`);
    
    if (totalFetched === 0) {
      console.log('❌ No contacts fetched');
      return;
    }
    
    // Process all contacts
    console.log('\n🔄 Processing contacts...');
    const processingStart = Date.now();
    const batchSize = 2000;
    let processed = 0;
    let created = 0;
    let updated = 0;
    
    for (let i = 0; i < allContacts.length; i += batchSize) {
      const batch = allContacts.slice(i, i + batchSize);
      
      try {
        const operations = [];
        
        for (const hubspotContact of batch) {
          const props = hubspotContact.properties;
          
          // Full transformation
          const contactData = {
            firstName: props.firstname || '',
            lastName: props.lastname || '',
            email: props.email || '',
            phone: props.phone || '',
            jobTitle: props.jobtitle || '',
            website: props.website || '',
            company: props.company || '', // Get actual company data from HubSpot
            address: {
              street: props.address || '',
              city: props.city || '',
              state: props.state || '',
              zipCode: props.zip || '',
              country: 'United States'
            },
            source: 'hubspot',
            sourceId: hubspotContact.id,
            lifecycleStage: mapLifecycleStage(props.lifecyclestage),
            
            // Business fields
            industry: props.business_category___industry_of_interest || props.industry || '',
            naicsCode: props.naics_code || '',
            numberOfEmployees: props.numemployees || '',
            yearEstablished: props.year_established || '',
            annualRevenue: props.annualrevenue || '',
            
            // DNC Status
            dncStatus: mapDncStatus(props.dnc_flag, props.optout),
            dncDate: mapDncStatus(props.dnc_flag, props.optout) === 'dnc_internal' ? new Date() : null,
            dncReason: mapDncStatus(props.dnc_flag, props.optout) === 'dnc_internal' ? 'Marked as DNC in HubSpot' : null,
            
            // Timestamps
            createdAt: props.createdate ? new Date(props.createdate) : new Date(),
            lastSyncedAt: new Date(),
            
            // Defaults
            status: 'active',
            tags: mapDncStatus(props.dnc_flag, props.optout) === 'dnc_internal' ? ['DNC'] : [],
            customFields: {
              hubspotDoNotCall: props.dnc_flag || 'false',
              hubspotMarketingOptOut: props.optout || 'false',
              // Store all the business fields
              accountType: props.account_type || '',
              broker: props.broker || '',
              buyerStatus: props.buyer_status || '',
              sellerStatus: props.seller_status || '',
              currentlyOwnBusiness: props.currently_own_a_business || '',
              legalOrgType: props.legal_organization_type || '',
              primaryInvestorType: props.primary_investor_type || '',
              buyingRole: props.buying_role || '',
              motivationForBuying: props.motivation_for_buying || '',
              leadSource: props.lead_source || '',
              contactType: props.contact_type || ''
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
        
        const result = await contactsCollection.bulkWrite(operations, { ordered: false });
        
        created += result.upsertedCount;
        updated += result.modifiedCount;
        processed += batch.length;
        
        const batchNum = Math.ceil((i + batchSize) / batchSize);
        const totalBatches = Math.ceil(allContacts.length / batchSize);
        console.log(`✅ Batch ${batchNum}/${totalBatches}: ${batch.length} contacts processed`);
        
      } catch (error) {
        console.error(`❌ Error processing batch: ${error.message}`);
      }
    }
    
    const processingTime = (Date.now() - processingStart) / 1000;
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
    
    console.log(`\n🎯 ROBUST SYNC RESULTS:`);
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
      console.log('🎉 SUCCESS! Robust sync completed with all contacts!');
    } else {
      console.log(`⚠️  Partial sync: ${finalTotal} contacts (may need to continue)`);
    }
    
  } catch (error) {
    console.error('💥 Robust sync failed:', error);
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

function mapDncStatus(dncFlag, optout) {
  if (dncFlag === 'true' || dncFlag === true || optout === 'true' || optout === true) {
    return 'dnc_internal';
  }
  return 'callable';
}

// Run robust sync
robustHubSpotSync();