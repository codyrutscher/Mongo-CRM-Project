require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

async function clearSellerCampaignType() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('Clearing Seller campaign type (keeping contacts)...\n');

    // Show current state
    const sellerCount = await Contact.countDocuments({ campaignType: 'Seller' });
    console.log(`Found ${sellerCount.toLocaleString()} Seller contacts\n`);

    // Clear campaign type for Seller contacts
    const result = await Contact.updateMany(
      { campaignType: 'Seller' },
      { 
        $set: { 
          campaignType: '',
          'customFields.campaignTypes': []
        } 
      }
    );

    console.log(`✅ Cleared campaign type from ${result.modifiedCount.toLocaleString()} contacts\n`);

    // Show new distribution
    const after = await Contact.aggregate([
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('Campaign Type Distribution After Clearing:');
    after.forEach(item => {
      console.log(`  ${item._id || '(empty)'}: ${item.count.toLocaleString()}`);
    });

    console.log('\n✨ Seller campaign types cleared!');
    console.log('Contacts still exist but no longer have Seller as campaign type.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearSellerCampaignType();
