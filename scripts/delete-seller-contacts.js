require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

async function deleteSellerContacts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('⚠️  WARNING: This will DELETE all contacts with campaignType = "Seller"!\n');

    // Show what will be deleted
    const sellerCount = await Contact.countDocuments({ campaignType: 'Seller' });
    console.log(`Found ${sellerCount.toLocaleString()} Seller contacts\n`);

    // Get sample
    const samples = await Contact.find({ campaignType: 'Seller' }).limit(5).lean();
    console.log('Sample Seller contacts to be deleted:');
    samples.forEach(c => {
      console.log(`  ${c.email} (source: ${c.source}, contactType: ${c.customFields?.contactTypeRaw || 'N/A'})`);
    });

    console.log('\n⚠️  Are you sure you want to DELETE these contacts?');
    console.log('This will PERMANENTLY remove them from the database.\n');
    console.log('If you want to just CLEAR the campaign type instead, use clear-all-campaign-types.js\n');

    // Uncomment the line below to actually delete
    // const result = await Contact.deleteMany({ campaignType: 'Seller' });
    // console.log(`✅ Deleted ${result.deletedCount.toLocaleString()} Seller contacts`);

    console.log('❌ Deletion commented out for safety. Uncomment in script to proceed.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteSellerContacts();
