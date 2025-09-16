require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('./src/models/Contact');

async function testNewCleanDefinition() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🧹 TESTING NEW CLEAN CONTACTS DEFINITION\n');

    // Old definition (current)
    const oldCleanQuery = {
      firstName: { $exists: true, $ne: "", $ne: null },
      lastName: { $exists: true, $ne: "", $ne: null },
      email: { $exists: true, $ne: "", $ne: null },
      phone: { $exists: true, $ne: "", $ne: null },
      company: { $exists: true, $ne: "", $ne: null },
    };

    // New definition (with meaningful company data)
    const newCleanQuery = {
      firstName: { $exists: true, $ne: "", $ne: null },
      lastName: { $exists: true, $ne: "", $ne: null },
      email: { $exists: true, $ne: "", $ne: null },
      phone: { $exists: true, $ne: "", $ne: null },
      company: { $exists: true, $ne: "", $ne: null, $regex: /.{2,}/ },
    };

    console.log('📊 OLD vs NEW CLEAN DEFINITION:');
    
    const oldTotal = await Contact.countDocuments(oldCleanQuery);
    const newTotal = await Contact.countDocuments(newCleanQuery);

    console.log(`Old Clean Definition: ${oldTotal.toLocaleString()}`);
    console.log(`New Clean Definition: ${newTotal.toLocaleString()}`);
    console.log(`Difference: ${(oldTotal - newTotal).toLocaleString()}`);

    // Test by source with new definition
    console.log('\n📈 NEW CLEAN COUNTS BY SOURCE:');

    const newCleanHubSpot = await Contact.countDocuments({
      source: "hubspot",
      ...newCleanQuery
    });

    const newCleanSheets = await Contact.countDocuments({
      source: "google_sheets",
      ...newCleanQuery
    });

    const newCleanCSV = await Contact.countDocuments({
      source: { $regex: "^csv_" },
      ...newCleanQuery
    });

    console.log(`New Clean HubSpot: ${newCleanHubSpot.toLocaleString()}`);
    console.log(`New Clean Sheets: ${newCleanSheets.toLocaleString()}`);
    console.log(`New Clean CSV: ${newCleanCSV.toLocaleString()}`);
    console.log(`New Clean Total: ${(newCleanHubSpot + newCleanSheets + newCleanCSV).toLocaleString()}`);

    await mongoose.disconnect();
    console.log('✅ Test completed!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testNewCleanDefinition();