require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

// Use Railway MongoDB URI
const MONGODB_URI = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

async function checkRailway() {
  try {
    console.log('🚂 Connecting to Railway MongoDB...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to Railway database\n');

    // Total contacts
    const total = await Contact.countDocuments();
    console.log(`📊 Total contacts: ${total.toLocaleString()}\n`);

    // By source
    const bySource = await Contact.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('By Source:');
    bySource.forEach(s => console.log(`  ${s._id}: ${s.count.toLocaleString()}`));

    // By campaign type
    const byCampaign = await Contact.aggregate([
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\nBy Campaign Type:');
    byCampaign.forEach(c => console.log(`  ${c._id || '(empty)'}: ${c.count.toLocaleString()}`));

    // Check for CSV contacts
    const csvCount = await Contact.countDocuments({ source: { $regex: '^csv_' } });
    console.log(`\n📁 CSV contacts: ${csvCount.toLocaleString()}`);

    // Check CSV Seller contacts specifically
    const csvSeller = await Contact.countDocuments({ 
      source: { $regex: '^csv_' },
      campaignType: 'Seller'
    });
    console.log(`📁 CSV Seller contacts: ${csvSeller.toLocaleString()}\n`);

    console.log('✨ When you run fresh-hubspot-sync-railway.js:');
    console.log('  - ALL contacts will be deleted (including CSV)');
    console.log('  - Only HubSpot contacts will be synced back');
    console.log('  - Expected total: 138,056\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRailway();
