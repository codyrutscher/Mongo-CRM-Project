require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const hubspotService = require('../src/services/hubspotService');

// Use Railway MongoDB URI
const MONGODB_URI = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

async function freshSync() {
  try {
    console.log('🚂 Connecting to Railway MongoDB...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to Railway database\n');

    console.log('⚠️  FRESH SYNC: This will delete ALL contacts and resync from HubSpot\n');

    // Delete all contacts
    const deleteResult = await Contact.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount.toLocaleString()} contacts\n`);

    console.log('📥 Fetching ALL contacts from HubSpot...');
    const hubspotContacts = await hubspotService.getAllContacts();
    console.log(`✅ Fetched ${hubspotContacts.length.toLocaleString()} contacts from HubSpot\n`);

    console.log('💾 Saving to Railway database...');
    let saved = 0;
    let withCampaignType = 0;

    for (let i = 0; i < hubspotContacts.length; i++) {
      const hubspotContact = hubspotContacts[i];
      const contactData = hubspotService.transformContactData(hubspotContact);

      contactData.source = 'hubspot';
      contactData.sourceId = `hubspot_${hubspotContact.id}`;
      contactData.lastSyncedAt = new Date();

      if (contactData.campaignType) {
        withCampaignType++;
      }

      try {
        await Contact.create(contactData);
        saved++;
      } catch (error) {
        console.error(`Error saving ${contactData.email}: ${error.message}`);
      }

      if ((i + 1) % 1000 === 0) {
        console.log(`  Progress: ${(i + 1).toLocaleString()}/${hubspotContacts.length.toLocaleString()} (${withCampaignType} with campaign type)`);
      }
    }

    console.log(`\n✅ Saved ${saved.toLocaleString()} contacts to Railway`);
    console.log(`📊 With campaign type: ${withCampaignType.toLocaleString()}\n`);

    // Show final stats
    const stats = await Contact.aggregate([
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('Campaign Type Distribution:');
    stats.forEach(s => console.log(`  ${s._id || '(empty)'}: ${s.count.toLocaleString()}`));

    const total = await Contact.countDocuments();
    console.log(`\n✨ Total contacts in Railway: ${total.toLocaleString()}`);
    console.log('Expected: 138,056\n');

    console.log('🎉 Railway database synced! Refresh your dashboard to see the changes.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

freshSync();
