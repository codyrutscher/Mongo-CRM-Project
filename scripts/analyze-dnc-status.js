require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

async function main() {
  try {
    console.log('Analyzing DNC Status in Prospere CRM\n');
    console.log('='.repeat(60));
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected\n');
    
    // Check dncStatus values
    const dncStatusValues = await Contact.aggregate([
      { $group: { _id: '$dncStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('dncStatus values:');
    dncStatusValues.forEach(v => {
      console.log(`  ${String(v._id).padEnd(20)} ${v.count.toLocaleString()} contacts`);
    });
    
    // Check contacts with DNC tag
    console.log('\nContacts with DNC tag:');
    const dncTagged = await Contact.countDocuments({ tags: 'DNC' });
    console.log(`  Total: ${dncTagged.toLocaleString()}`);
    
    // Sample DNC contacts
    console.log('\nSample DNC contacts:');
    const samples = await Contact.find({ tags: 'DNC' })
      .limit(5)
      .select('email dncStatus tags customFields')
      .lean();
    
    samples.forEach((s, i) => {
      console.log(`\n  ${i + 1}. ${s.email}`);
      console.log(`     dncStatus: ${s.dncStatus}`);
      console.log(`     tags: ${s.tags?.join(', ')}`);
      if (s.customFields) {
        console.log(`     customFields keys: ${Object.keys(s.customFields).slice(0, 10).join(', ')}`);
      }
    });
    
    // Check if we need to sync from HubSpot
    console.log('\n' + '='.repeat(60));
    console.log('FINDING:');
    console.log('='.repeat(60));
    console.log('\nThe specific DNC properties (dnc___seller_outreach, etc.)');
    console.log('are NOT being synced from HubSpot to Prospere CRM.');
    console.log('\nWe need to:');
    console.log('1. Update HubSpot sync to include these properties');
    console.log('2. Run a one-time sync to populate them');
    console.log('3. Then export to Response Genius');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
