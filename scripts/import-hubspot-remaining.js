require('dotenv').config();
const mongoose = require('mongoose');
const hubspotService = require('../src/services/hubspotService');
const Contact = require('../src/models/Contact');

const BATCH_SIZE = 1000;

async function importRemainingHubSpotContacts() {
  try {
    console.log('🚀 Starting remaining HubSpot import...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get current HubSpot contact count
    const currentCount = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`📊 Current HubSpot contacts in database: ${currentCount}`);
    
    // Get all contacts from HubSpot to see total
    console.log('📄 Fetching all HubSpot contacts...');
    const allHubSpotContacts = await hubspotService.getAllContacts();
    console.log(`📈 Total contacts in HubSpot: ${allHubSpotContacts.length}`);
    
    const remaining = allHubSpotContacts.length - currentCount;
    console.log(`🎯 Contacts to import: ${remaining}`);
    
    if (remaining <= 0) {
      console.log('✨ All HubSpot contacts are already imported!');
      return;
    }
    
    // Process all contacts (will update existing and create new)
    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < allHubSpotContacts.length; i += BATCH_SIZE) {
      const batch = allHubSpotContacts.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} contacts)...`);
      
      for (const hubspotContact of batch) {
        try {
          const contactData = hubspotService.transformContactData(hubspotContact);
          
          // Check if contact exists
          const existingContact = await Contact.findOne({
            $or: [
              { source: 'hubspot', sourceId: contactData.sourceId },
              { email: contactData.email }
            ]
          });
          
          if (existingContact) {
            // Update existing contact
            Object.assign(existingContact, contactData);
            existingContact.lastSyncedAt = new Date();
            await existingContact.save();
            updated++;
          } else {
            // Create new contact
            const contact = new Contact(contactData);
            await contact.save();
            created++;
          }
          
          processed++;
          
          if (processed % 500 === 0) {
            console.log(`📊 Progress: ${processed}/${allHubSpotContacts.length} (${((processed / allHubSpotContacts.length) * 100).toFixed(1)}%)`);
            console.log(`   Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
          }
          
        } catch (error) {
          errors++;
          if (errors <= 10) {
            console.error(`❌ Error processing contact:`, error.message);
          }
        }
      }
    }
    
    console.log('\n🎉 HubSpot import completed!');
    console.log(`📈 Total processed: ${processed}`);
    console.log(`✨ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    
    // Get final stats
    const finalStats = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`🎯 Total HubSpot contacts in database: ${finalStats}`);
    
  } catch (error) {
    console.error('💥 Import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the import
importRemainingHubSpotContacts();