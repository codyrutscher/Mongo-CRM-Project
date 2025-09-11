require('dotenv').config();
const mongoose = require('mongoose');
const hubspotService = require('../src/services/hubspotService');
const segmentService = require('../src/services/segmentService');
const Contact = require('../src/models/Contact');

const DNC_LIST_ID = '6199'; // Your client's DNC list ID (new static list)
const BATCH_SIZE = 500;

async function syncHubSpotDNCList() {
  try {
    console.log('🚫 === HUBSPOT DNC LIST SYNC ===');
    console.log(`📋 Syncing HubSpot list ID: ${DNC_LIST_ID}`);
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Initialize default segments (including DNC segments)
    await segmentService.initializeDefaultSegments();
    console.log('✅ Default segments initialized');
    
    // Get contacts from the specific DNC list
    console.log('📄 Fetching contacts from HubSpot DNC list...');
    const dncContacts = await hubspotService.getAllContactsFromList(DNC_LIST_ID);
    console.log(`📈 Found ${dncContacts.length} contacts in DNC list`);
    
    if (dncContacts.length === 0) {
      console.log('⚠️  No contacts found in DNC list. Check list ID and permissions.');
      return;
    }
    
    let processed = 0;
    let created = 0;
    let updated = 0;
    let markedDNC = 0;
    let errors = 0;
    
    // Process contacts in batches
    for (let i = 0; i < dncContacts.length; i += BATCH_SIZE) {
      const batch = dncContacts.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Processing DNC batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(dncContacts.length / BATCH_SIZE)} (${batch.length} contacts)...`);
      
      for (const hubspotContact of batch) {
        try {
          const contactData = hubspotService.transformContactData(hubspotContact);
          
          // Mark as DNC and add list membership
          contactData.dncStatus = 'dnc_internal';
          contactData.dncDate = new Date();
          contactData.dncReason = 'HubSpot DNC List';
          contactData.customFields.hubspotListId = DNC_LIST_ID;
          contactData.customFields.hubspotListName = 'DNC List';
          contactData.customFields.isDncList = 'true';
          
          // Check if contact exists
          const existingContact = await Contact.findOne({
            $or: [
              { source: 'hubspot', sourceId: contactData.sourceId },
              { email: contactData.email }
            ]
          });
          
          if (existingContact) {
            // Update existing contact with DNC status
            Object.assign(existingContact, contactData);
            existingContact.lastSyncedAt = new Date();
            await existingContact.save();
            updated++;
            markedDNC++;
          } else {
            // Create new contact
            const contact = new Contact(contactData);
            await contact.save();
            created++;
            markedDNC++;
          }
          
          processed++;
          
          if (processed % 100 === 0) {
            console.log(`   Progress: ${processed}/${dncContacts.length} | Created: ${created} | Updated: ${updated} | DNC Marked: ${markedDNC}`);
          }
          
        } catch (error) {
          errors++;
          if (errors <= 10) {
            console.error(`❌ Error processing DNC contact:`, error.message);
          }
        }
      }
    }
    
    console.log('\n🎉 DNC List Sync Completed!');
    console.log(`📈 Total processed: ${processed}`);
    console.log(`✨ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`🚫 Marked as DNC: ${markedDNC}`);
    console.log(`❌ Errors: ${errors}`);
    
    // Get final DNC counts
    const dncCounts = await Contact.aggregate([
      { $group: { _id: '$dncStatus', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📊 === DNC STATUS BREAKDOWN ===');
    dncCounts.forEach(status => {
      const statusLabel = {
        'callable': '✅ Callable',
        'dnc_internal': '🚫 Internal DNC',
        'dnc_federal': '🇺🇸 Federal DNC',
        'dnc_state': '🏛️  State DNC',
        'dnc_wireless': '📱 Wireless DNC'
      };
      console.log(`${statusLabel[status._id] || status._id}: ${status.count}`);
    });
    
    // Update segment counts
    const hubspotDncCount = await Contact.countDocuments({
      source: 'hubspot',
      'customFields.hubspotListId': DNC_LIST_ID
    });
    console.log(`🎯 HubSpot DNC List segment: ${hubspotDncCount} contacts`);
    
  } catch (error) {
    console.error('💥 DNC sync failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the DNC sync
syncHubSpotDNCList();