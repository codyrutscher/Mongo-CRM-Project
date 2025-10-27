require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const fs = require('fs');

/**
 * Export Cold Leads to CSV files for manual upload to Response Genius
 * Creates 4 separate CSV files, one for each Cold Lead type
 */

async function exportColdLeadsForResponseGenius() {
  console.log('=== Exporting Cold Leads for Response Genius ===\n');

  try {
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Find all Cold Leads
    const coldLeads = await Contact.find({
      tags: 'Cold Lead',
      status: 'active'
    });

    console.log(`Found ${coldLeads.length} Cold Leads\n`);

    // Separate by type
    const lists = {
      seller: [],
      buyer: [],
      cre: [],
      exf: []
    };

    coldLeads.forEach(contact => {
      const customFields = contact.customFields || {};
      
      const contactData = {
        email: contact.email || '',
        first_name: contact.firstName || '',
        last_name: contact.lastName || '',
        phone: contact.phone || '',
        hubspot_id: contact.sourceId || ''
      };

      if (customFields.sellerColdLead) lists.seller.push(contactData);
      if (customFields.buyerColdLead) lists.buyer.push(contactData);
      if (customFields.creColdLead) lists.cre.push(contactData);
      if (customFields.exfColdLead) lists.exf.push(contactData);
    });

    // Create CSV files
    const timestamp = new Date().toISOString().split('T')[0];
    
    Object.entries(lists).forEach(([type, contacts]) => {
      if (contacts.length === 0) return;

      const filename = `response-genius-${type}-dnc-${timestamp}.csv`;
      const headers = 'email,first_name,last_name,phone,hubspot_id\n';
      const rows = contacts.map(c => 
        `${c.email},"${c.first_name}","${c.last_name}",${c.phone},${c.hubspot_id}`
      ).join('\n');

      fs.writeFileSync(filename, headers + rows);
      console.log(`✅ Created: ${filename} (${contacts.length} contacts)`);
    });

    console.log('\n📊 Summary:');
    console.log(`   Seller DNC: ${lists.seller.length}`);
    console.log(`   Buyer DNC: ${lists.buyer.length}`);
    console.log(`   CRE DNC: ${lists.cre.length}`);
    console.log(`   EXF DNC: ${lists.exf.length}`);

    console.log('\n📝 Next Steps:');
    console.log('1. Upload each CSV file to the corresponding Response Genius list:');
    console.log('   - response-genius-seller-dnc-*.csv → dnc___seller_outreach');
    console.log('   - response-genius-buyer-dnc-*.csv → dnc___buyer_outreach');
    console.log('   - response-genius-cre-dnc-*.csv → dnc___cre_outreach');
    console.log('   - response-genius-exf-dnc-*.csv → dnc___exf_outreach');
    console.log('2. Contact Response Genius support about API access for automated sync');

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

exportColdLeadsForResponseGenius();
