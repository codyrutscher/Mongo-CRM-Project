require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

async function cleanSimpleSync() {
  try {
    console.log('✨ === CLEAN SIMPLE HUBSPOT SYNC ===');
    console.log('Using ONLY the fields from prosperecsv.csv + DNC field');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    // Verify clean start
    const existingCount = await contactsCollection.countDocuments({ source: 'hubspot' });
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing HubSpot contacts - clearing first...`);
      await contactsCollection.deleteMany({ source: 'hubspot' });
      console.log('✅ Cleared existing contacts');
    }
    
    const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
    const headers = {
      'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    // ONLY the fields from prosperecsv.csv + DNC fields + system fields
    const properties = [
      // From prosperecsv.csv
      'firstname', 'lastname', 'email', 'phone', 'jobtitle', 'linkedin_profile_url',
      'company', 'website', 'business_category___industry_of_interest', 'naics_code',
      'numemployees', 'year_established', 'office_phone', 'address', 'city', 'state', 'zip',
      'lead_source', 'contact_type', 'hs_email_last_send_date',
      
      // System fields
      'createdate', 'lastmodifieddate', 'lifecyclestage',
      
      // DNC fields
      'do_not_call', 'dnc_flag', 'optout'
    ].join(',');
    
    console.log(`📋 Using ${properties.split(',').length} properties only`);
    
    let allContacts = [];
    let totalFetched = 0;
    let after = null;
    let pageCount = 0;
    
    console.log('\n📡 Fetching HubSpot contacts...');
    const startTime = Date.now();
    
    while (pageCount < 2000) {
      try {
        const response = await axios.get(baseURL, {
          headers,
          params: {
            properties: properties,
            limit: 100, // Use full batch size
            ...(after && { after })
          }
        });
        
        if (response.data.results && response.data.results.length > 0) {
          allContacts.push(...response.data.results);
          totalFetched += response.data.results.length;
          pageCount++;
          
          // Update pagination
          if (response.data.paging && response.data.paging.next) {
            after = response.data.paging.next.after;
          } else {
            console.log('✅ Reached end of HubSpot contacts');
            break;
          }
          
          // Progress updates
          if (totalFetched % 5000 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = totalFetched / elapsed;
            console.log(`📊 Fetched ${totalFetched} contacts (${rate.toFixed(0)}/sec)`);
          }
          
        } else {
          console.log('⚠️  Empty response');
          break;
        }
        
      } catch (error) {
        console.error(`❌ Error at page ${pageCount}: ${error.response?.status} - ${error.message}`);
        
        if (error.response?.status === 429) {
          console.log('⏳ Rate limited, waiting 10 seconds...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          continue;
        }
        
        console.error('💥 Stopping due to API error');
        break;
      }
      
      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const fetchTime = (Date.now() - startTime) / 1000;
    console.log(`\n📊 FETCH COMPLETE:`);
    console.log(`📋 Total contacts fetched: ${totalFetched}`);
    console.log(`⏱️  Fetch time: ${fetchTime.toFixed(1)} seconds`);
    console.log(`🚀 Average rate: ${(totalFetched / fetchTime).toFixed(0)} contacts/second`);
    
    if (totalFetched === 0) {
      console.log('❌ No contacts fetched');
      return;
    }
    
    // Process and save contacts
    console.log('\n💾 Saving contacts to database...');
    const processingStart = Date.now();
    const batchSize = 5000;
    let processed = 0;
    let created = 0;
    
    for (let i = 0; i < allContacts.length; i += batchSize) {
      const batch = allContacts.slice(i, i + batchSize);
      
      try {
        const operations = [];
        
        for (const hubspotContact of batch) {
          const props = hubspotContact.properties;
          
          // Clean, simple transformation matching prosperecsv.csv exactly
          const contactData = {
            // Personal Information
            firstName: props.firstname || '',
            lastName: props.lastname || '',
            email: props.email || '',
            phone: props.phone || '',
            jobTitle: props.jobtitle || '',
            contactLinkedInProfile: props.linkedin_profile_url || '',
            
            // Company Information
            company: props.company || '',
            companyWebsiteURL: props.website || '',
            industry: props.business_category___industry_of_interest || '',
            naicsCode: props.naics_code || '',
            numberOfEmployees: props.numemployees || '',
            yearCompanyEstablished: props.year_established || '',
            companyPhoneNumber: props.office_phone || '',
            
            // Address Information
            companyStreetAddress: props.address || '',
            companyCity: props.city || '',
            companyState: props.state || '',
            companyZipCode: props.zip || '',
            
            // Lead Information
            leadSource: props.lead_source || '',
            campaignCategory: props.contact_type || '',
            lastCampaignDate: props.hs_email_last_send_date ? new Date(props.hs_email_last_send_date) : null,
            
            // System fields
            source: 'hubspot',
            sourceId: hubspotContact.id,
            lifecycleStage: mapLifecycleStage(props.lifecyclestage),
            
            // DNC Status
            dncStatus: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout),
            dncDate: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout) === 'dnc_internal' ? new Date() : null,
            dncReason: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout) === 'dnc_internal' ? 'Marked as DNC in HubSpot' : null,
            
            // Timestamps
            createdAt: props.createdate ? new Date(props.createdate) : new Date(),
            lastSyncedAt: new Date(),
            
            // Status and tags
            status: 'active',
            tags: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout) === 'dnc_internal' ? ['DNC'] : [],
            
            // Store DNC fields in customFields for reference
            customFields: {
              hubspotDoNotCall: props.do_not_call || 'false',
              hubspotDncFlag: props.dnc_flag || 'false',
              hubspotMarketingOptOut: props.optout || 'false'
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
    
    console.log(`\n🎯 CLEAN SYNC RESULTS:`);
    console.log(`📊 Total contacts in database: ${finalTotal}`);
    console.log(`🔗 HubSpot contacts: ${hubspotTotal}`);
    console.log(`📈 Contacts processed: ${processed}`);
    console.log(`✨ Contacts created: ${created}`);
    console.log(`🏢 Contacts with company: ${withCompany} (${((withCompany/hubspotTotal)*100).toFixed(1)}%)`);
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
      console.log('🎉 SUCCESS! Clean HubSpot sync completed!');
      console.log(`📊 Expected company fill rate: ~37.75% (${Math.round(hubspotTotal * 0.3775)} contacts)`);
      console.log(`📊 Actual company fill rate: ${((withCompany/hubspotTotal)*100).toFixed(1)}% (${withCompany} contacts)`);
    } else {
      console.log(`⚠️  Partial sync: ${hubspotTotal} contacts (expected ~135K)`);
    }
    
  } catch (error) {
    console.error('💥 Clean sync failed:', error);
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
  if (doNotCall === 'true' || doNotCall === true || doNotCall === 'Yes' ||
      dncFlag === 'true' || dncFlag === true ||
      optout === 'true' || optout === true) {
    return 'dnc_internal';
  }
  return 'callable';
}

// Run clean sync
cleanSimpleSync();