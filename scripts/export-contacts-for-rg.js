require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const fs = require('fs');

const lists = {
  dnc_seller: { property: 'dnc___seller_outreach', filename: 'rg-dnc-seller.csv' },
  dnc_buyer: { property: 'dnc___buyer_outreach', filename: 'rg-dnc-buyer.csv' },
  dnc_cre: { property: 'dnc___cre_outreach', filename: 'rg-dnc-cre.csv' },
  dnc_exf: { property: 'dnc___exf_outreach', filename: 'rg-dnc-exf.csv' },
  cold_seller: { property: 'seller_cold_lead', filename: 'rg-cold-seller.csv' },
  cold_buyer: { property: 'buyer_cold_lead', filename: 'rg-cold-buyer.csv' },
  cold_cre: { property: 'cre_cold_lead', filename: 'rg-cold-cre.csv' },
  cold_exf: { property: 'exf_cold_lead', filename: 'rg-cold-exf.csv' }
};

async function exportContacts() {
  try {
    console.log('📤 Exporting Contacts for Response Genius\n');
    
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    console.log('✅ Connected to database\n');

    for (const [key, config] of Object.entries(lists)) {
      console.log(`Exporting ${config.filename}...`);
      
      const contacts = await Contact.find({
        [config.property]: true,
        email: { $exists: true, $ne: null, $ne: '' }
      }).select('email firstName lastName phone').lean();
      
      if (contacts.length === 0) {
        console.log(`  No contacts found\n`);
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
      console.log(`  ✅ Exported ${contacts.length.toLocaleString()} contacts\n`);
    }
    
    console.log('✅ Export complete!');
    console.log('\nNext steps:');
    console.log('1. Upload each CSV file to its corresponding Response Genius list');
    console.log('2. After upload, the webhook will automatically sync future changes');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

exportContacts();
