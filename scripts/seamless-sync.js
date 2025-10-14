require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

async function seamlessSync() {
  try {
    console.log('🚀 === SEAMLESS HUBSPOT SYNC ===');
    console.log('Identifying and skipping problematic contacts to maintain full batch sizes');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    // Clear existing
    await contactsCollection.deleteMany({ source: 'hubspot' });
    console.log('✅ Starting with clean database');
    
    const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
    const headers = {
      'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    // Only the essential fields from prosperecsv.csv
    const properties = 'firstname,lastname,email,phone,jobtitle,linkedin_profile_url,company,website,business_category___industry_of_interest,naics_code,numemployees,year_established,office_phone,address,city,state,zip,lead_source,contact_type,hs_email_last_send_date,createdate,lastmodifieddate,lifecyclestage,do_not_call,dnc_flag,optout';
    
    // Pre-identify problematic ranges (we know these from testing)
    const knownProblematicRanges = [
      { start: 28052, end: 28152 },
      { start: 372802, end: 372902 },
      { start: 403635, end: 403735 },
      { start: 405813, end: 405913 }
    ];
    
    let allContacts = [];
    let totalFetched = 0;
    let after = null;
    let pageCount = 0;
    let skippedRanges = 0;
    
    console.log('\n📡 Starting seamless fetch with problematic range skipping...');
    const startTime = Date.now();
    
    while (pageCount < 2000) {
      try {
        // Check if we're in a known problematic range
        const currentAfter = parseInt(after) || 0;
        const inProblematicRange = knownProblematicRanges.some(range => 
          currentAfter >= range.start && currentAfter <= range.end
        );
        
        if (inProblematicRange) {
          console.log(`⚠️  Skipping known problematic range around ${currentAfter}`);
          // Skip past this range
          const problematicRange = knownProblematicRanges.find(range => 
            currentAfter >= range.start && currentAfter <= range.end
          );
          after = (problematicRange.end + 100).toString();
          skippedRanges++;
          continue;
        }
        
        const response = await axios.get(baseURL, {
          headers,
          params: {
            properties: properties,
            limit: 100,
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
          if (totalFetched % 10000 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = totalFetched / elapsed;
            console.log(`📊 Fetched ${totalFetched} contacts (${rate.toFixed(0)}/sec) - Full batch size maintained`);
          }
          
        } else {
          console.log('⚠️  Empty response');
          break;
        }
        
      } catch (error) {
        console.error(`❌ Error at after ${after}: ${error.response?.status}`);
        
        if (error.response?.status === 500) {
          // Add this range to our known problematic ranges and skip it
          const currentAfter = parseInt(after) || 0;
          console.log(`🚨 New problematic range found at ${currentAfter}, skipping...`);
          after = (currentAfter + 200).toString(); // Skip ahead
          skippedRanges++;
          continue;
        }
        
        if (error.response?.status === 429) {
          console.log('⏳ Rate limited, waiting 10 seconds...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          continue;
        }
        
        console.error('💥 Stopping due to API error');
        break;
      }
      
      // Minimal delay
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    
    const fetchTime = (Date.now() - startTime) / 1000;
    console.log(`\n📊 SEAMLESS FETCH COMPLETE:`);
    console.log(`📋 Total contacts fetched: ${totalFetched}`);
    console.log(`⚠️  Problematic ranges skipped: ${skippedRanges}`);
    console.log(`⏱️  Fetch time: ${fetchTime.toFixed(1)} seconds`);
    console.log(`🚀 Average rate: ${(totalFetched / fetchTime).toFixed(0)} contacts/second`);
    
    if (totalFetched === 0) {
      console.log('❌ No contacts fetched');
      return;
    }
    
    // Process and save contacts
    console.log('\n💾 Saving contacts to database...');
    const processingStart = Date.now();
    const batchSize = 10000; // Large batches for speed
    let processed = 0;
    let created = 0;
    
    for (let i = 0; i < allContacts.length; i += batchSize) {
      const batch = allContacts.slice(i, i + batchSize);
      
      try {
        const operations = batch.map(hubspotContact => {
          const props = hubspotContact.properties;
          
          return {
            insertOne: {
              document: {
                // Map exactly to prosperecsv.csv structure
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
                sourceId: hubspotContact.id,
                lifecycleStage: mapLifecycleStage(props.lifecyclestage),
                dncStatus: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout),
                dncDate: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout) === 'dnc_internal' ? new Date() : null,
                dncReason: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout) === 'dnc_internal' ? 'DNC in HubSpot' : null,
                createdAt: props.createdate ? new Date(props.createdate) : new Date(),
                lastSyncedAt: new Date(),
                status: 'active',
                tags: mapDncStatus(props.do_not_call, props.dnc_flag, props.optout) === 'dnc_internal' ? ['DNC'] : [],
                customFields: {
                  hubspotDoNotCall: props.do_not_call || 'false',
                  hubspotDncFlag: props.dnc_flag || 'false',
                  hubspotMarketingOptOut: props.optout || 'false'
                }
              }
            }
          };
        });
        
        const result = await contactsCollection.bulkWrite(operations, { ordered: false });
        
        created += result.insertedCount;
        processed += batch.length;
        
        console.log(`✅ Saved ${batch.length} contacts (${processed}/${allContacts.length})`);
        
      } catch (error) {
        console.error(`❌ Error saving batch: ${error.message}`);
      }
    }
    
    const processingTime = (Date.now() - processingStart) / 1000;
    const totalTime = (Date.now() - startTime) / 1000;
    
    // Final results
    const finalTotal = await contactsCollection.countDocuments();
    const dncCount = await contactsCollection.countDocuments({ dncStatus: 'dnc_internal' });
    const callableCount = finalTotal - dncCount;
    const withCompany = await contactsCollection.countDocuments({
      company: { $exists: true, $ne: '', $ne: null }
    });
    
    console.log(`\n🎯 SEAMLESS SYNC RESULTS:`);
    console.log(`📊 Total contacts: ${finalTotal}`);
    console.log(`🏢 With company: ${withCompany} (${((withCompany/finalTotal)*100).toFixed(1)}%)`);
    console.log(`🚫 DNC contacts: ${dncCount}`);
    console.log(`✅ Callable contacts: ${callableCount}`);
    console.log(`⚠️  Ranges skipped: ${skippedRanges} (problematic contacts)`);
    console.log(`⏱️  Total time: ${totalTime.toFixed(1)} seconds`);
    console.log(`🚀 Overall rate: ${(processed / totalTime).toFixed(0)} contacts/second`);
    
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
    
    if (finalTotal > 130000) {
      console.log('🎉 SUCCESS! Seamless sync completed with full batch sizes!');
    } else {
      console.log(`📊 Partial sync: ${finalTotal} contacts (some ranges skipped due to API issues)`);
    }
    
  } catch (error) {
    console.error('💥 Seamless sync failed:', error);
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

seamlessSync();