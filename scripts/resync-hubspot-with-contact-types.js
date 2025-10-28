require('dotenv').config();
const mongoose = require('mongoose');
const hubspotService = require('../src/services/hubspotService');
const Contact = require('../src/models/Contact');

async function resyncHubSpot() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('   RESYNC HUBSPOT WITH CONTACT TYPES');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('🔄 Fetching ALL contacts from HubSpot...');
    console.log('This will fetch contact_type and map it to campaignType\n');

    const hubspotContacts = await hubspotService.getAllContacts();
    console.log(`✅ Fetched ${hubspotContacts.length.toLocaleString()} contacts from HubSpot\n`);

    console.log('💾 Updating database with contact types...\n');

    let updated = 0;
    let created = 0;
    let withContactType = 0;

    for (let i = 0; i < hubspotContacts.length; i++) {
      const hubspotContact = hubspotContacts[i];
      const contactData = hubspotService.transformContactData(hubspotContact);

      contactData.source = 'hubspot';
      contactData.sourceId = `hubspot_${hubspotContact.id}`;
      contactData.lastSyncedAt = new Date();

      // Check if contact_type was set
      if (contactData.campaignType) {
        withContactType++;
      }

      try {
        const existing = await Contact.findOne({ 
          sourceId: contactData.sourceId 
        });

        if (existing) {
          await Contact.updateOne({ _id: existing._id }, contactData);
          updated++;
        } else {
          await Contact.create(contactData);
          created++;
        }
      } catch (error) {
        // Skip errors
      }

      if ((i + 1) % 1000 === 0) {
        console.log(`  Progress: ${(i + 1).toLocaleString()}/${hubspotContacts.length.toLocaleString()} (${updated} updated, ${created} created, ${withContactType} with contact_type)`);
      }
    }

    console.log(`\n✅ Sync complete!`);
    console.log(`  Updated: ${updated.toLocaleString()}`);
    console.log(`  Created: ${created.toLocaleString()}`);
    console.log(`  With contact_type: ${withContactType.toLocaleString()}\n`);

    // Show final distribution
    const finalCounts = await Contact.aggregate([
      { $match: { source: 'hubspot' } },
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Campaign Type Distribution:');
    finalCounts.forEach(item => {
      const label = item._id || '(not set)';
      console.log(`  ${label}: ${item.count.toLocaleString()}`);
    });

    console.log('\n═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

resyncHubSpot();
