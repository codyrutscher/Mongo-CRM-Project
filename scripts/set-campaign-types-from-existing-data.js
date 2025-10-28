require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

async function setCampaignTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('   SET CAMPAIGN TYPES FROM EXISTING DATA');
    console.log('═══════════════════════════════════════════════════════\n');

    // The contact_type from HubSpot is already mapped to campaignType by fieldMappingService
    // Let's check what we have
    const contacts = await Contact.find({ source: 'hubspot' }).lean();
    console.log(`📊 Total HubSpot contacts: ${contacts.length.toLocaleString()}\n`);

    // Check current campaignType distribution
    const currentDist = await Contact.aggregate([
      { $match: { source: 'hubspot' } },
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Current Campaign Type Distribution:');
    currentDist.forEach(item => {
      const label = item._id || '(not set)';
      console.log(`  ${label}: ${item.count.toLocaleString()}`);
    });

    // Sample some contacts to see what data we have
    console.log('\n📋 Sample contacts:');
    const samples = contacts.slice(0, 10);
    samples.forEach(c => {
      console.log(`  ${c.email}:`);
      console.log(`    campaignType: ${c.campaignType || '(not set)'}`);
      console.log(`    campaignCategory: ${c.campaignCategory || '(not set)'}`);
      if (c.customFields) {
        console.log(`    customFields.accountType: ${c.customFields.accountType || '(not set)'}`);
        console.log(`    customFields.contactType: ${c.customFields.contactType || '(not set)'}`);
      }
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   RECOMMENDATION');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('The contact_type field from HubSpot should be automatically');
    console.log('mapped to campaignType during sync.');
    console.log('\nTo populate campaign types:');
    console.log('1. Run a fresh HubSpot sync to fetch contact_type');
    console.log('2. Or upload your CSV file with Campaign Category column\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setCampaignTypes();
