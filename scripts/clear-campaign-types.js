require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

async function clearCampaignTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Check current state
    const beforeCounts = await Contact.aggregate([
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 Current Campaign Type Distribution:');
    beforeCounts.forEach(item => {
      console.log(`  ${item._id || '(empty)'}: ${item.count}`);
    });

    // Clear all campaignType values
    const result = await Contact.updateMany(
      { campaignType: { $ne: '' } },
      { $set: { campaignType: '' } }
    );

    console.log(`\n✅ Cleared campaignType from ${result.modifiedCount} contacts`);

    // Verify
    const afterCounts = await Contact.aggregate([
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 After Clearing:');
    afterCounts.forEach(item => {
      console.log(`  ${item._id || '(empty)'}: ${item.count}`);
    });

    console.log('\n✨ All campaign types cleared! Ready for CSV upload.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearCampaignTypes();
