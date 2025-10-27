require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

async function permanentlyDeleteManualContacts() {
  console.log('=== Permanently Deleting Manual Contacts ===\n');

  try {
    // Connect to Railway database
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    console.log('✅ Connected to Railway database\n');

    // Find all manual contacts
    const manualContacts = await Contact.find({ source: 'manual' });
    console.log(`Found ${manualContacts.length} manual contacts\n`);

    if (manualContacts.length === 0) {
      console.log('✅ No manual contacts to delete');
      await mongoose.disconnect();
      return;
    }

    // Show sample
    console.log('Sample manual contacts to be deleted:');
    manualContacts.slice(0, 10).forEach((contact, i) => {
      console.log(`  ${i + 1}. ${contact.email || 'No email'} (${contact.sourceId})`);
    });
    
    if (manualContacts.length > 10) {
      console.log(`  ... and ${manualContacts.length - 10} more\n`);
    }

    // Permanently delete them
    console.log('\n🗑️  Permanently deleting manual contacts...');
    const result = await Contact.deleteMany({ source: 'manual' });
    console.log(`✅ Deleted ${result.deletedCount} manual contacts`);

    // Get new count
    const finalCount = await Contact.countDocuments({ status: 'active' });
    const hubspotCount = await Contact.countDocuments({ source: 'hubspot', status: 'active' });
    
    console.log('\n📊 Final Counts:');
    console.log(`   Active Contacts: ${finalCount.toLocaleString()}`);
    console.log(`   HubSpot Contacts: ${hubspotCount.toLocaleString()}`);
    console.log(`   Manual Contacts: 0`);

    await mongoose.disconnect();
    console.log('\n✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

permanentlyDeleteManualContacts();
