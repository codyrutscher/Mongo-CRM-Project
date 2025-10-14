const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

/**
 * Create test contacts for all 4 Cold Lead categories:
 * - Seller Cold Lead (seller_cold_lead)
 * - Buyer Cold Lead (buyer_cold_lead) 
 * - CRE Cold Lead (cre_cold_lead)
 * - EXF Cold Lead (exf_cold_lead)
 */

async function createAllColdLeadTypes() {
  console.log('🏗️ Creating test contacts for all Cold Lead categories...');
  console.log('=====================================================');
  
  try {
    const timestamp = Date.now();
    const coldLeadTypes = [
      {
        type: 'Seller',
        field: 'sellerColdLead',
        hubspotField: 'seller_cold_lead',
        email: `seller.coldlead.${timestamp}@example.com`,
        firstName: 'Sarah',
        lastName: 'SellerTest',
        company: 'Seller Test Company',
        tags: ['Cold Lead', 'Cold Lead - Seller']
      },
      {
        type: 'Buyer',
        field: 'buyerColdLead',
        hubspotField: 'buyer_cold_lead',
        email: `buyer.coldlead.${timestamp}@example.com`,
        firstName: 'Bob',
        lastName: 'BuyerTest',
        company: 'Buyer Test Company',
        tags: ['Cold Lead', 'Cold Lead - Buyer']
      },
      {
        type: 'CRE',
        field: 'creColdLead',
        hubspotField: 'cre_cold_lead',
        email: `cre.coldlead.${timestamp}@example.com`,
        firstName: 'Charlie',
        lastName: 'CRETest',
        company: 'CRE Test Company',
        tags: ['Cold Lead', 'Cold Lead - CRE']
      },
      {
        type: 'EXF',
        field: 'exfColdLead',
        hubspotField: 'exf_cold_lead',
        email: `exf.coldlead.${timestamp}@example.com`,
        firstName: 'Emma',
        lastName: 'EXFTest',
        company: 'EXF Test Company',
        tags: ['Cold Lead', 'Cold Lead - EXF']
      }
    ];

    const createdContacts = [];

    for (const coldLead of coldLeadTypes) {
      console.log(`\n📝 Creating ${coldLead.type} Cold Lead...`);
      
      // Create custom fields object
      const customFields = {
        coldLead: true,
        coldLeadTypes: [coldLead.type],
        sellerColdLead: coldLead.type === 'Seller',
        buyerColdLead: coldLead.type === 'Buyer',
        creColdLead: coldLead.type === 'CRE',
        exfColdLead: coldLead.type === 'EXF',
        coldLeadSyncDate: new Date().toISOString(),
        hubspotProperties: {}
      };
      
      // Set the HubSpot property name for reference
      customFields.hubspotProperties[coldLead.hubspotField] = 'true';
      
      const testContact = new Contact({
        email: coldLead.email,
        firstName: coldLead.firstName,
        lastName: coldLead.lastName,
        phone: `555-${coldLead.type.toUpperCase()}-${String(timestamp).slice(-4)}`,
        company: coldLead.company,
        source: 'hubspot',
        sourceId: `TEST_${coldLead.type.toUpperCase()}_${timestamp}`,
        lifecycleStage: 'lead',
        leadSource: 'hubspot_cold_lead',
        tags: coldLead.tags,
        customFields: customFields,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await testContact.save();
      
      console.log(`✅ ${coldLead.type} Cold Lead created:`);
      console.log(`   Name: ${testContact.firstName} ${testContact.lastName}`);
      console.log(`   Email: ${testContact.email}`);
      console.log(`   Company: ${testContact.company}`);
      console.log(`   HubSpot ID: ${testContact.sourceId}`);
      console.log(`   HubSpot Property: ${coldLead.hubspotField} = true`);
      console.log(`   Tags: ${testContact.tags.join(', ')}`);
      
      createdContacts.push({
        type: coldLead.type,
        contact: testContact,
        hubspotField: coldLead.hubspotField
      });
    }
    
    console.log('\n🎯 SUMMARY: All Cold Lead Types Created');
    console.log('==========================================');
    createdContacts.forEach((item, index) => {
      console.log(`${index + 1}. ${item.type} Cold Lead`);
      console.log(`   Email: ${item.contact.email}`);
      console.log(`   HubSpot ID: ${item.contact.sourceId}`);
      console.log(`   HubSpot Property: ${item.hubspotField}`);
      console.log('');
    });
    
    console.log('📋 Next Steps:');
    console.log('1. Run: node scripts/manage-deleted-cold-leads.js --stats');
    console.log('2. All 4 Cold Lead types should be visible');
    console.log('3. Test deletion: node scripts/test-cold-lead-deletion.js');
    console.log('4. Or delete from HubSpot: node scripts/delete-hubspot-cold-lead.js --list-cold-leads');
    
    return createdContacts;
    
  } catch (error) {
    console.error('❌ Error creating Cold Lead contacts:', error.message);
    throw error;
  }
}

// Run the creation
if (require.main === module) {
  createAllColdLeadTypes()
    .then((contacts) => {
      console.log(`\n🎉 Successfully created ${contacts.length} Cold Lead test contacts!`);
      console.log('All 4 Cold Lead categories are now represented in the database.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Creation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createAllColdLeadTypes };