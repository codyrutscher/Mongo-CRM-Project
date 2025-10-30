require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const fs = require('fs');

const lists = {
  dnc_seller: { property: 'dnc___seller_outreach', filename: 'rg-new-dnc-seller.csv' },
  dnc_buyer: { property: 'dnc___buyer_outreach', filename: 'rg-new-dnc-buyer.csv' },
  dnc_cre: { property: 'dnc___cre_outreach', filename: 'rg-new-dnc-cre.csv' },
  dnc_exf: { property: 'dnc___exf_outreach', filename: 'rg-new-dnc-exf.csv' },
  cold_seller: { property: 'seller_cold_lead', filename: 'rg-new-cold-seller.csv' },
  cold_buyer: { property: 'buyer_cold_lead', filename: 'rg-new-cold-buyer.csv' },
  cold_cre: { property: 'cre_cold_lead', filename: 'rg-new-cold-cre.csv' },
  cold_exf: { property: 'exf_cold_lead', filename: 'rg-new-cold-exf.csv' }
};

async function exportNewContacts() {
  try {
    console.log('📤 Exporting NEW Contacts (since 10/28) for Response Genius\n');
    
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    console.log('✅ Connected to database\n');

    const cutoffDate = new Date('2025-10-28');
    let totalNew = 0;

    for (const [key, config] of Object.entries(lists)) {
      console.log(`Exporting ${config.filename}...`);
      
      // Only get contacts created or updated since 10/28
      const contacts = await Contact.find({
        [config.property]: true,
        email: { $exists: true, $ne: null, $ne: '' },
        $or: [
          { createdAt: { $gte: cutoffDate } },
          { updatedAt: { $gte: cutoffDate } }
        ]
      }).select('email firstName lastName phone createdAt updatedAt').lean();
      
      if (contacts.length === 0) {
        console.log(`  No new contacts found\n`);
        continue;
      }
      
      // Create CSV
      const csv = [
        'email,first_name,last_name,phone',
        ...contacts.map(c => 
          `${c.email},"${c.firstName || ''}","${c.lastName || ''}","${c.phone || ''}"`
        )
      ].join('\n');
      
      fs.writeFileSync(config.filename, csv);
      console.log(`  ✅ Exported ${contacts.length.toLocaleString()} NEW contacts\n`);
      totalNew += contacts.length;
    }
    
    console.log('✅ Export complete!');
    console.log(`\nTotal new contacts: ${totalNew.toLocaleString()}`);
    console.log('\nThese are contacts added/updated since 10/28 that are NOT in Response Genius yet.');
    console.log('\nNext steps:');
    console.log('1. Upload each CSV file to its corresponding Response Genius list');
    console.log('2. Response Genius will skip duplicates automatically (by email)');
    console.log('3. After upload, the webhook will sync all future changes');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

exportNewContacts();
