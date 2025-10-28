require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

async function clearAllCampaignTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('⚠️  WARNING: This will clear ALL campaign types!');
    console.log('This will set campaignType to empty string for all contacts.\n');

    // Show current state
    const before = await Contact.aggregate([
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('Current Campaign Type Distribution:');
    before.forEach(item => {
      console.log(`  ${item._id || '(empty)'}: ${item.count.toLocaleString()}`);
    });

    console.log('\nClearing all campaign types...');

    // Clear all campaign types
    const result = await Contact.updateMany(
      {},
      { 
        $set: { 
          campaignType: '',
          'customFields.campaignTypes': [],
          'customFields.contactTypeRaw': ''
        } 
      }
    );

    console.log(`✅ Cleared campaign types from ${result.modifiedCount.toLocaleString()} contacts\n`);

    // Show after state
    const after = await Contact.aggregate([
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('After Clearing:');
    after.forEach(item => {
      console.log(`  ${item._id || '(empty)'}: ${item.count.toLocaleString()}`);
    });

    console.log('\n✨ All campaign types cleared!');
    console.log('You can now run the sync again to repopulate with correct data.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearAllCampaignTypes();
