require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

async function checkStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('         CAMPAIGN TYPE STATUS REPORT');
    console.log('═══════════════════════════════════════════════════════\n');

    // Total contacts
    const total = await Contact.countDocuments();
    console.log(`📊 Total Contacts: ${total.toLocaleString()}\n`);

    // By source
    console.log('📁 Contacts by Source:');
    const bySource = await Contact.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    bySource.forEach(item => {
      console.log(`  ${item._id}: ${item.count.toLocaleString()}`);
    });

    // Campaign Type distribution
    console.log('\n🎯 Campaign Type Distribution:');
    const byCampaignType = await Contact.aggregate([
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    byCampaignType.forEach(item => {
      const label = item._id || '(not set)';
      console.log(`  ${label}: ${item.count.toLocaleString()}`);
    });

    // Check if any have campaignType set (not empty)
    const withCampaignType = await Contact.countDocuments({
      campaignType: { $exists: true, $ne: '', $ne: null, $in: ['Buyer', 'Seller', 'CRE', 'Exit Factor'] }
    });

    console.log(`\n✨ Contacts with Campaign Type set: ${withCampaignType.toLocaleString()}`);
    console.log(`⚠️  Contacts without Campaign Type: ${(total - withCampaignType).toLocaleString()}`);

    // Recommendations
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('         RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════\n');

    if (withCampaignType === 0) {
      console.log('🎯 ACTION REQUIRED: Set Campaign Types\n');
      console.log('Your contacts do not have campaign types set yet.');
      console.log('Here are your options:\n');
      
      console.log('📤 OPTION 1: Upload CSV File (RECOMMENDED)');
      console.log('  1. Go to: Contacts → CSV Contacts');
      console.log('  2. Upload: Enriched - Deal Maverick-ZoomInfo.csv');
      console.log('  3. The "Campaign Category" column will auto-map');
      console.log('  4. Dashboard will show campaign type breakdown\n');
      
      console.log('🔄 OPTION 2: Sync from HubSpot');
      console.log('  1. Set "contact_type" field in HubSpot for contacts');
      console.log('  2. Values: Buyer, Seller, CRE, or Exit Factor');
      console.log('  3. Run HubSpot sync');
      console.log('  4. Campaign types will populate automatically\n');
      
      console.log('💡 TIP: Option 1 is faster and you already have the CSV file!');
    } else {
      console.log('✅ Campaign types are set!');
      console.log('\nYou can now:');
      console.log('  • View dashboard for campaign type breakdown');
      console.log('  • Use Contacts dropdown to filter by type');
      console.log('  • Click dashboard cards to see filtered contacts');
      console.log('  • Export contacts by campaign type');
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStatus();
