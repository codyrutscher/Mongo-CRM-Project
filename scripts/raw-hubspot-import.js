require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

async function rawHubSpotImport() {
  try {
    console.log('📥 === RAW HUBSPOT IMPORT ===');
    console.log('Importing ALL HubSpot contacts exactly as they are - no transformation');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Create a separate collection for raw HubSpot data
    const rawContactsCollection = db.collection('raw_hubspot_contacts');
    
    // Clear any existing raw data
    await rawContactsCollection.deleteMany({});
    console.log('✅ Cleared existing raw data');
    
    const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
    const headers = {
      'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    // Use only the fields from prosperecsv.csv + DNC fields
    const properties = 'firstname,lastname,email,phone,jobtitle,linkedin_profile_url,company,website,business_category___industry_of_interest,naics_code,numemployees,year_established,office_phone,address,city,state,zip,lead_source,contact_type,hs_email_last_send_date,createdate,lastmodifieddate,lifecyclestage,do_not_call,dnc_flag,optout';
    
    let totalFetched = 0;
    let after = null;
    let pageCount = 0;
    let errorCount = 0;
    
    console.log('\n📡 Fetching ALL HubSpot contacts as raw data...');
    const startTime = Date.now();
    
    while (pageCount < 2000 && errorCount < 10) {
      try {
        const response = await axios.get(baseURL, {
          headers,
          params: {
            properties: properties,
            limit: 100,
            ...(after && { after })
          }
        });
        
        if (response.data.results && response.data.results.length > 0) {
          // Save raw HubSpot data directly - no transformation
          const rawContacts = response.data.results.map(contact => ({
            hubspotId: contact.id,
            rawProperties: contact.properties,
            importedAt: new Date(),
            processed: false
          }));
          
          await rawContactsCollection.insertMany(rawContacts);
          
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
          if (totalFetched % 10000 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = totalFetched / elapsed;
            console.log(`📊 Imported ${totalFetched} raw contacts (${rate.toFixed(0)}/sec)`);
          }
          
        } else {
          console.log('⚠️  Empty response');
          break;
        }
        
      } catch (error) {
        console.error(`❌ Error at page ${pageCount}: ${error.response?.status}`);
        errorCount++;
        
        if (error.response?.status === 429) {
          console.log('⏳ Rate limited, waiting 10 seconds...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          continue;
        }
        
        if (errorCount >= 10) {
          console.error('💥 Too many errors, stopping import');
          break;
        }
        
        // Try to skip past problematic data
        if (after && !isNaN(after)) {
          after = (parseInt(after) + 100).toString();
          console.log(`⏭️  Skipping ahead to after: ${after}`);
        }
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const fetchTime = (Date.now() - startTime) / 1000;
    console.log(`\n📊 RAW IMPORT COMPLETE:`);
    console.log(`📋 Total raw contacts imported: ${totalFetched}`);
    console.log(`⏱️  Import time: ${fetchTime.toFixed(1)} seconds`);
    console.log(`🚀 Average rate: ${(totalFetched / fetchTime).toFixed(0)} contacts/second`);
    console.log(`🚨 Errors encountered: ${errorCount}`);
    
    if (totalFetched === 0) {
      console.log('❌ No contacts imported');
      return;
    }
    
    // Now transform the raw data into proper contacts
    console.log('\n🔄 Transforming raw data into proper contacts...');
    const transformStart = Date.now();
    
    const contactsCollection = db.collection('contacts');
    await contactsCollection.deleteMany({ source: 'hubspot' }); // Clear any existing
    
    const rawContacts = await rawContactsCollection.find({}).toArray();
    console.log(`📋 Processing ${rawContacts.length} raw contacts...`);
    
    const transformBatchSize = 5000;
    let transformed = 0;
    
    for (let i = 0; i < rawContacts.length; i += transformBatchSize) {
      const batch = rawContacts.slice(i, i + transformBatchSize);
      
      try {
        const operations = [];
        
        for (const rawContact of batch) {
          const props = rawContact.rawProperties;
          
          // Transform to our contact structure
          const contactData = {
            // From prosperecsv.csv mapping
            firstName: props.firstname || '',
            lastName: props.lastname || '',
            email: props.email || '',
            phone: props.phone || '',
            jobTitle: props.jobtitle || '',
            contactLinkedInProfile: props.linkedin_profile_url || '',
            company: props.company || '',
            companyWebsiteURL: props.website || '',
            industry: props.business_category___industry_of_interest || '',
            naicsCode: props.naics_code || '',
            numberOfEmployees: props.numemployees || '',
            yearCompanyEstablished: props.year_established || '',
            companyPhoneNumber: props.office_phone || '',
            companyStreetAddress: props.address || '',
            companyCity: props.city || '',
            companyState: props.state || '',
            companyZipCode: props.zip || '',
            leadSource: props.lead_source || '',
            campaignCategory: props.contact_type || '',
            lastCampaignDate: props.hs_email_last_send_date ? new Date(props.hs_email_last_send_date) : null,
            
            // System fields
            source: 'hubspot',
            sourceId: rawContact.hubspotId,
            lifecycleStage: mapLifecycleStage(props.lifecyclestage),
            
            // DNC mapping
            dncStatus: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout),
            dncDate: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout) === 'dnc_internal' ? new Date() : null,
            dncReason: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout) === 'dnc_internal' ? 'DNC in HubSpot' : null,
            
            // Timestamps
            createdAt: props.createdate ? new Date(props.createdate) : new Date(),
            lastSyncedAt: new Date(),
            
            // Status
            status: 'active',
            tags: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout) === 'dnc_internal' ? ['DNC'] : [],
            
            // Store DNC info in customFields
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
        transformed += result.insertedCount;
        
        const batchNum = Math.ceil((i + transformBatchSize) / transformBatchSize);
        const totalBatches = Math.ceil(rawContacts.length / transformBatchSize);
        console.log(`✅ Transformed batch ${batchNum}/${totalBatches}: ${batch.length} contacts`);
        
      } catch (error) {
        console.error(`❌ Error transforming batch: ${error.message}`);
      }
    }
    
    const transformTime = (Date.now() - transformStart) / 1000;
    const totalTime = (Date.now() - startTime) / 1000;
    
    // Final verification
    const finalTotal = await contactsCollection.countDocuments({ source: 'hubspot' });
    const dncCount = await contactsCollection.countDocuments({ dncStatus: 'dnc_internal' });
    const callableCount = await contactsCollection.countDocuments({ dncStatus: 'callable' });
    const withCompany = await contactsCollection.countDocuments({
      source: 'hubspot',
      company: { $exists: true, $ne: '', $ne: null }
    });
    
    console.log(`\n🎯 FINAL RESULTS:`);
    console.log(`📊 Total HubSpot contacts: ${finalTotal}`);
    console.log(`🏢 Contacts with company: ${withCompany} (${((withCompany/finalTotal)*100).toFixed(1)}%)`);
    console.log(`🚫 DNC contacts: ${dncCount}`);
    console.log(`✅ Callable contacts: ${callableCount}`);
    console.log(`⏱️  Transform time: ${transformTime.toFixed(1)} seconds`);
    console.log(`⏱️  Total time: ${totalTime.toFixed(1)} seconds`);
    console.log(`🚀 Overall rate: ${(finalTotal / totalTime).toFixed(0)} contacts/second`);
    
    // Update segments
    const segmentsCollection = db.collection('segments');
    await Promise.all([
      segmentsCollection.updateOne(
        { $or: [{ name: 'DNC - Do Not Call' }, { name: 'DNC - Do Not Call (Dynamic)' }] },
        { $set: { contactCount: dncCount, lastCountUpdate: new Date() } }
      ),
      segmentsCollection.updateOne(
        { $or: [{ name: 'Callable Contacts' }, { name: 'Callable Contacts (Dynamic)' }] },
        { $set: { contactCount: callableCount, lastCountUpdate: new Date() } }
      )
    ]);
    
    console.log('✅ Updated segment counts');
    
    // Clean up raw data
    await rawContactsCollection.drop();
    console.log('✅ Cleaned up raw import data');
    
    console.log('\n🎉 RAW IMPORT AND TRANSFORMATION COMPLETE!');
    console.log('📊 All contacts imported with proper field mapping from prosperecsv.csv');
    
  } catch (error) {
    console.error('💥 Raw import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

function mapLifecycleStage(stage) {
  const map = {
    'subscriber': 'lead', 'lead': 'lead', 'marketingqualifiedlead': 'prospect',
    'salesqualifiedlead': 'prospect', 'opportunity': 'prospect', 'customer': 'customer'
  };
  return map[stage] || 'lead';
}

function mapDncStatus(doNotCall, dncFlag, optout) {
  return (doNotCall === 'true' || dncFlag === 'true' || optout === 'true') ? 'dnc_internal' : 'callable';
}

rawHubSpotImport();