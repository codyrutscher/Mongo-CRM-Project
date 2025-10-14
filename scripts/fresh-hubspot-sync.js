require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

async function freshHubSpotSync() {
  try {
    console.log('🚀 === FRESH HUBSPOT SYNC ===');
    console.log('Starting completely clean sync with all properties');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    // Verify we're starting clean
    const existingCount = await contactsCollection.countDocuments({ source: 'hubspot' });
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing HubSpot contacts - please run clear script first`);
      return;
    }
    
    console.log('✅ Starting with clean database');
    
    const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
    const headers = {
      'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    // Use ALL properties we need - we know these work from our testing
    const allProperties = 'firstname,lastname,jobtitle,linkedin_profile_url,email,phone,company,website,business_category___industry_of_interest,naics_code,numemployees,year_established,office_phone,address,city,state,zip,lead_source,contact_type,hs_email_last_send_date,createdate,lastmodifieddate,lifecyclestage,annualrevenue,industry,account_type,broker,buyer_status,seller_status,interested_in,currently_own_a_business,legal_organization_type,primary_investor_type,buying_role,motivation_for_buying,do_not_call,dnc_flag,optout,compliance_notes';
    
    let allContacts = [];
    let totalFetched = 0;
    let after = null;
    let pageCount = 0;
    let errorCount = 0;
    const maxErrors = 5;
    
    console.log('\n📡 Starting fresh HubSpot data fetch...');
    const startTime = Date.now();
    
    while (pageCount < 2000 && errorCount < maxErrors) {
      let batchSize = 100; // Start optimistic
      let success = false;
      
      // Adaptive batch sizing - try smaller sizes if needed
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
            
            // Update pagination
            if (response.data.paging && response.data.paging.next) {
              after = response.data.paging.next.after;
            } else {
              console.log('✅ Reached end of HubSpot contacts');
              break;
            }
            
            // Progress updates
            if (totalFetched % 1000 === 0) {
              const elapsed = (Date.now() - startTime) / 1000;
              const rate = totalFetched / elapsed;
              console.log(`📊 Fetched ${totalFetched} contacts (${rate.toFixed(0)}/sec) - batch: ${currentBatchSize}`);
            }
            
            // Log when we need smaller batches
            if (currentBatchSize < 100) {
              console.log(`⚠️  Using batch size ${currentBatchSize} at after: ${after}`);
            }
            
            break; // Success, move to next batch
            
          } else {
            console.log('⚠️  Empty response');
            break;
          }
          
        } catch (error) {
          if (currentBatchSize === 1) {
            // Even single contact fails - handle gracefully
            console.log(`🚨 Problematic contact at after: ${after} - Status: ${error.response?.status}`);
            
            // Try to get minimal info and skip
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
                console.log(`   Skipping: ${problematicContact.properties.firstname} ${problematicContact.properties.lastname}`);
                
                // Create minimal record
                const minimalContact = {
                  firstName: problematicContact.properties.firstname || '',
                  lastName: problematicContact.properties.lastname || '',
                  email: problematicContact.properties.email || '',
                  source: 'hubspot',
                  sourceId: problematicContact.id,
                  company: '',
                  dncStatus: 'callable',
                  status: 'active',
                  createdAt: new Date(),
                  lastSyncedAt: new Date(),
                  tags: ['SYNC_ERROR'],
                  customFields: {
                    syncError: 'Could not fetch full properties'
                  }
                };
                
                await contactsCollection.insertOne(minimalContact);
                allContacts.push(problematicContact);
                totalFetched++;
                after = problematicContact.id;
                success = true;
                break;
              }
              
            } catch (skipError) {
              console.log(`   ❌ Could not skip: ${skipError.response?.status}`);
              errorCount++;
              
              // Try manual increment
              if (after && !isNaN(after)) {
                after = (parseInt(after) + 1).toString();
                success = true;
                break;
              }
            }
          }
          
          // Try smaller batch size
          continue;
        }
      }
      
      if (!success) {
        console.log('❌ All batch sizes failed');
        break;
      }
      
      // Rate limiting protection
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
    
    // Process and save all contacts with proper transformation
    console.log('\n🔄 Processing and saving contacts...');
    const processingStart = Date.now();
    const batchSize = 2000;
    let processed = 0;
    let created = 0;
    
    for (let i = 0; i < allContacts.length; i += batchSize) {
      const batch = allContacts.slice(i, i + batchSize);
      
      try {
        const operations = [];
        
        for (const hubspotContact of batch) {
          const props = hubspotContact.properties;
          
          // Complete contact transformation
          const contactData = {
            // Basic info
            firstName: props.firstname || '',
            lastName: props.lastname || '',
            email: props.email || '',
            phone: props.phone || '',
            jobTitle: props.jobtitle || '',
            
            // Company info - THIS IS KEY!
            company: props.company || '',
            website: props.website || '',
            
            // Address
            address: {
              street: props.address || '',
              city: props.city || '',
              state: props.state || '',
              zipCode: props.zip || '',
              country: 'United States'
            },
            
            // Business fields
            industry: props.business_category___industry_of_interest || props.industry || '',
            naicsCode: props.naics_code || '',
            numberOfEmployees: props.numemployees || '',
            yearEstablished: props.year_established || '',
            annualRevenue: props.annualrevenue || '',
            
            // System fields
            source: 'hubspot',
            sourceId: hubspotContact.id,
            lifecycleStage: mapLifecycleStage(props.lifecyclestage),
            
            // DNC Status - using multiple fields for accuracy
            dncStatus: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout),
            dncDate: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout) === 'dnc_internal' ? new Date() : null,
            dncReason: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout) === 'dnc_internal' ? 'Marked as DNC in HubSpot' : null,
            
            // Timestamps
            createdAt: props.createdate ? new Date(props.createdate) : new Date(),
            lastSyncedAt: new Date(),
            
            // Status and tags
            status: 'active',
            tags: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout) === 'dnc_internal' ? ['DNC'] : [],
            
            // Custom fields - store ALL the business data
            customFields: {
              // HubSpot specific
              hubspotDoNotCall: props.do_not_call || 'false',
              hubspotDncFlag: props.dnc_flag || 'false',
              hubspotMarketingOptOut: props.optout || 'false',
              linkedinProfile: props.linkedin_profile_url || '',
              
              // Business fields
              accountType: props.account_type || '',
              broker: props.broker || '',
              buyerStatus: props.buyer_status || '',
              sellerStatus: props.seller_status || '',
              interestedIn: props.interested_in || '',
              currentlyOwnBusiness: props.currently_own_a_business || '',
              legalOrgType: props.legal_organization_type || '',
              primaryInvestorType: props.primary_investor_type || '',
              buyingRole: props.buying_role || '',
              motivationForBuying: props.motivation_for_buying || '',
              
              // Lead info
              leadSource: props.lead_source || '',
              contactType: props.contact_type || '',
              officePhone: props.office_phone || '',
              lastEmailSent: props.hs_email_last_send_date || '',
              complianceNotes: props.compliance_notes || ''
            }
          };
          
          operations.push({
            insertOne: {
              document: contactData
            }
          });
        }
        
        const result = await contactsCollection.bulkWrite(operations, { ordered: false });
        
        created += result.insertedCount;
        processed += batch.length;
        
        const batchNum = Math.ceil((i + batchSize) / batchSize);
        const totalBatches = Math.ceil(allContacts.length / batchSize);
        console.log(`✅ Batch ${batchNum}/${totalBatches}: ${batch.length} contacts saved`);
        
      } catch (error) {
        console.error(`❌ Error saving batch: ${error.message}`);
      }
    }
    
    const processingTime = (Date.now() - processingStart) / 1000;
    const totalTime = (Date.now() - startTime) / 1000;
    
    // Final verification
    const finalTotal = await contactsCollection.countDocuments();
    const hubspotTotal = await contactsCollection.countDocuments({ source: 'hubspot' });
    const dncCount = await contactsCollection.countDocuments({ dncStatus: 'dnc_internal' });
    const callableCount = await contactsCollection.countDocuments({ 
      $or: [
        { dncStatus: 'callable' },
        { dncStatus: { $exists: false } },
        { dncStatus: null }
      ]
    });
    
    // Check company data
    const withCompany = await contactsCollection.countDocuments({
      source: 'hubspot',
      company: { $exists: true, $ne: '', $ne: null }
    });
    
    console.log(`\n🎯 FRESH SYNC RESULTS:`);
    console.log(`📊 Total contacts in database: ${finalTotal}`);
    console.log(`🔗 HubSpot contacts: ${hubspotTotal}`);
    console.log(`📈 Contacts processed: ${processed}`);
    console.log(`✨ Contacts created: ${created}`);
    console.log(`🏢 Contacts with company: ${withCompany}`);
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
    
    if (hubspotTotal > 130000) {
      console.log('🎉 SUCCESS! Fresh HubSpot sync completed successfully!');
      console.log(`📊 Company data: ${withCompany} contacts (${((withCompany/hubspotTotal)*100).toFixed(1)}%)`);
    } else {
      console.log(`⚠️  Partial sync: ${hubspotTotal} contacts (expected ~135K)`);
    }
    
  } catch (error) {
    console.error('💥 Fresh sync failed:', error);
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

function mapDncStatus(doNotCall, dncFlag, optout) {
  // Check multiple DNC indicators
  if (doNotCall === 'true' || doNotCall === true || doNotCall === 'Yes' ||
      dncFlag === 'true' || dncFlag === true ||
      optout === 'true' || optout === true) {
    return 'dnc_internal';
  }
  return 'callable';
}

// Run fresh sync
freshHubSpotSync();