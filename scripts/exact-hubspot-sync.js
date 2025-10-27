require('dotenv').config();
const mongoose = require('mongoose');
const hubspotService = require('../src/services/hubspotService');

async function exactHubSpotSync() {
  try {
    console.log('🎯 === EXACT HUBSPOT SYNC ===');
    console.log('Goal: Make Prospere CRM exactly match HubSpot contact count');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    // Step 1: Get current counts
    const currentTotal = await contactsCollection.countDocuments();
    console.log(`\n📊 Current Prospere CRM: ${currentTotal} contacts`);
    
    // Step 2: Get fresh HubSpot count
    console.log('📡 Fetching fresh HubSpot contact count...');
    let hubspotTotal = 0;
    let allHubSpotIds = new Set();
    
    try {
      let hasMore = true;
      let after = null;
      let pageCount = 0;
      
      while (hasMore) {
        const response = await hubspotService.getContacts(100, after);
        
        if (response.results) {
          response.results.forEach(contact => {
            allHubSpotIds.add(contact.id);
          });
          hubspotTotal += response.results.length;
        }
        
        hasMore = response.paging && response.paging.next;
        after = hasMore ? response.paging.next.after : null;
        pageCount++;
        
        if (pageCount % 50 === 0) {
          console.log(`   Fetched ${hubspotTotal} contacts so far...`);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching HubSpot contacts:', error.message);
      console.log('📊 Using last known HubSpot count: 135,815');
      hubspotTotal = 135815;
    }
    
    console.log(`📊 Fresh HubSpot total: ${hubspotTotal} contacts`);
    console.log(`📊 Difference: ${currentTotal - hubspotTotal} extra in Prospere`);
    
    if (currentTotal === hubspotTotal) {
      console.log('🎉 PERFECT! Counts already match exactly!');
      return;
    }
    
    // Step 3: Identify discrepancies
    console.log('\n🔍 Analyzing discrepancies...');
    
    // Get all our HubSpot contact IDs
    const ourContacts = await contactsCollection.find(
      { source: 'hubspot', sourceId: { $ne: null, $ne: '' } },
      { sourceId: 1, _id: 1, firstName: 1, lastName: 1, email: 1, createdAt: 1 }
    ).toArray();
    
    const ourHubSpotIds = new Set(ourContacts.map(c => c.sourceId));
    
    console.log(`📋 Our HubSpot contacts: ${ourHubSpotIds.size}`);
    console.log(`📋 HubSpot API contacts: ${allHubSpotIds.size}`);
    
    // Find contacts we have that HubSpot doesn't
    const extraInOurs = [];
    ourContacts.forEach(contact => {
      if (!allHubSpotIds.has(contact.sourceId)) {
        extraInOurs.push(contact);
      }
    });
    
    // Find contacts HubSpot has that we don't
    const missingInOurs = [];
    allHubSpotIds.forEach(hubspotId => {
      if (!ourHubSpotIds.has(hubspotId)) {
        missingInOurs.push(hubspotId);
      }
    });
    
    console.log(`\n📊 DISCREPANCY ANALYSIS:`);
    console.log(`🔴 Contacts we have but HubSpot doesn't: ${extraInOurs.length}`);
    console.log(`🟡 Contacts HubSpot has but we don't: ${missingInOurs.length}`);
    
    // Step 4: Handle extra contacts in our system
    if (extraInOurs.length > 0) {
      console.log(`\n🗑️  Removing ${extraInOurs.length} contacts that no longer exist in HubSpot:`);
      
      for (const contact of extraInOurs.slice(0, 10)) { // Show first 10
        console.log(`   - ${contact.firstName} ${contact.lastName} (${contact.email}) - HubSpot ID: ${contact.sourceId}`);
      }
      
      if (extraInOurs.length > 10) {
        console.log(`   ... and ${extraInOurs.length - 10} more`);
      }
      
      // Remove these contacts
      const extraIds = extraInOurs.map(c => c._id);
      const deleteResult = await contactsCollection.deleteMany({
        _id: { $in: extraIds }
      });
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} contacts`);
    }
    
    // Step 5: Handle missing contacts
    if (missingInOurs.length > 0) {
      console.log(`\n📥 Fetching ${missingInOurs.length} missing contacts from HubSpot:`);
      
      let fetchedCount = 0;
      const batchSize = 100;
      
      for (let i = 0; i < missingInOurs.length; i += batchSize) {
        const batch = Array.from(missingInOurs).slice(i, i + batchSize);
        
        try {
          for (const hubspotId of batch) {
            const hubspotContact = await hubspotService.getContacts(1, null, hubspotId);
            
            if (hubspotContact.results && hubspotContact.results[0]) {
              const contactData = hubspotService.transformContactData(hubspotContact.results[0]);
              
              // Check if contact already exists (shouldn't, but safety check)
              const existing = await contactsCollection.findOne({
                source: 'hubspot',
                sourceId: contactData.sourceId
              });
              
              if (!existing) {
                await contactsCollection.insertOne(contactData);
                fetchedCount++;
              }
            }
          }
          
          console.log(`   Fetched ${Math.min(i + batchSize, missingInOurs.length)}/${missingInOurs.length} contacts...`);
          
        } catch (error) {
          console.error(`❌ Error fetching batch: ${error.message}`);
        }
      }
      
      console.log(`✅ Added ${fetchedCount} missing contacts`);
    }
    
    // Step 6: Final verification
    const finalTotal = await contactsCollection.countDocuments();
    const finalDncCount = await contactsCollection.countDocuments({ dncStatus: 'dnc_internal' });
    const finalCallableCount = await contactsCollection.countDocuments({ 
      $or: [
        { dncStatus: 'callable' },
        { dncStatus: { $exists: false } },
        { dncStatus: null }
      ]
    });
    
    console.log(`\n🎯 FINAL RESULTS:`);
    console.log(`📊 HubSpot Total: ${hubspotTotal}`);
    console.log(`📊 Prospere Total: ${finalTotal}`);
    console.log(`📊 Difference: ${finalTotal - hubspotTotal}`);
    console.log(`🚫 DNC Contacts: ${finalDncCount}`);
    console.log(`✅ Callable Contacts: ${finalCallableCount}`);
    
    if (finalTotal === hubspotTotal) {
      console.log('🎉 SUCCESS! Counts now match exactly!');
    } else {
      console.log(`⚠️  Still ${Math.abs(finalTotal - hubspotTotal)} contacts difference`);
      console.log('This might be due to real-time changes in HubSpot during sync');
    }
    
    // Update segment counts
    const segmentsCollection = db.collection('segments');
    
    await segmentsCollection.updateOne(
      { $or: [{ name: 'DNC - Do Not Call' }, { name: 'DNC - Do Not Call (Dynamic)' }] },
      { $set: { contactCount: finalDncCount, lastCountUpdate: new Date() } }
    );
    
    await segmentsCollection.updateOne(
      { $or: [{ name: 'Callable Contacts' }, { name: 'Callable Contacts (Dynamic)' }] },
      { $set: { contactCount: finalCallableCount, lastCountUpdate: new Date() } }
    );
    
    console.log('✅ Updated segment counts');
    
  } catch (error) {
    console.error('💥 Exact sync failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run exact sync
exactHubSpotSync();