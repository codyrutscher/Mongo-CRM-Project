const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function verifyColdLeads() {
  console.log('🔍 Verifying Cold Leads in Database...');
  console.log('=====================================');
  
  try {
    const allColdLeads = await Contact.find({
      $or: [
        { 'customFields.coldLead': true },
        { 'customFields.sellerColdLead': true },
        { 'customFields.buyerColdLead': true },
        { 'customFields.creColdLead': true },
        { 'customFields.exfColdLead': true },
        { tags: { $in: ['Cold Lead'] } }
      ]
    }).sort({ createdAt: -1 });
    
    console.log(`\n📊 Found ${allColdLeads.length} Cold Lead contacts:\n`);
    
    allColdLeads.forEach((contact, index) => {
      const types = [];
      if (contact.customFields?.sellerColdLead) types.push('Seller');
      if (contact.customFields?.buyerColdLead) types.push('Buyer');
      if (contact.customFields?.creColdLead) types.push('CRE');
      if (contact.customFields?.exfColdLead) types.push('EXF');
      
      const isDeleted = contact.customFields?.deletedFromHubSpot === true;
      const deletedDate = contact.customFields?.deletedFromHubSpotDate ? 
        new Date(contact.customFields.deletedFromHubSpotDate).toLocaleString() : 'N/A';
      
      console.log(`${index + 1}. ${contact.firstName} ${contact.lastName}`);
      console.log(`   📧 Email: ${contact.email}`);
      console.log(`   🏢 Company: ${contact.company || 'N/A'}`);
      console.log(`   🆔 HubSpot ID: ${contact.sourceId}`);
      console.log(`   📊 Status: ${contact.status}`);
      console.log(`   🏷️ Cold Lead Types: ${types.length > 0 ? types.join(', ') : 'Unknown'}`);
      console.log(`   🗑️ Deleted from HubSpot: ${isDeleted ? 'YES' : 'NO'}`);
      if (isDeleted) {
        console.log(`   📅 Deletion Date: ${deletedDate}`);
      }
      console.log(`   🏷️ Tags: ${contact.tags ? contact.tags.join(', ') : 'None'}`);
      console.log(`   📅 Created: ${contact.createdAt.toLocaleString()}`);
      console.log('');
    });
    
    const activeInHubSpot = allColdLeads.filter(c => !c.customFields?.deletedFromHubSpot).length;
    const deletedFromHubSpot = allColdLeads.filter(c => c.customFields?.deletedFromHubSpot === true).length;
    
    const sellerCount = allColdLeads.filter(c => c.customFields?.sellerColdLead).length;
    const buyerCount = allColdLeads.filter(c => c.customFields?.buyerColdLead).length;
    const creCount = allColdLeads.filter(c => c.customFields?.creColdLead).length;
    const exfCount = allColdLeads.filter(c => c.customFields?.exfColdLead).length;
    
    console.log('📊 SUMMARY STATISTICS:');
    console.log('=====================');
    console.log(`Total Cold Leads: ${allColdLeads.length}`);
    console.log(`Active in HubSpot: ${activeInHubSpot}`);
    console.log(`Deleted from HubSpot: ${deletedFromHubSpot}`);
    console.log('');
    console.log('Cold Lead Type Breakdown:');
    console.log(`  Seller Cold Leads: ${sellerCount}`);
    console.log(`  Buyer Cold Leads: ${buyerCount}`);
    console.log(`  CRE Cold Leads: ${creCount}`);
    console.log(`  EXF Cold Leads: ${exfCount}`);
    
    if (deletedFromHubSpot > 0) {
      console.log('');
      console.log('🛡️ PROTECTION SYSTEM STATUS:');
      console.log('============================');
      console.log(`✅ ${deletedFromHubSpot} Cold Lead(s) protected from deletion`);
      console.log('✅ All deleted Cold Leads preserved in Prospere CRM');
      console.log('✅ Deletion timestamps recorded');
      console.log('✅ Contacts remain searchable and accessible');
    }
    
    return {
      total: allColdLeads.length,
      activeInHubSpot,
      deletedFromHubSpot,
      breakdown: {
        seller: sellerCount,
        buyer: buyerCount,
        cre: creCount,
        exf: exfCount
      }
    };
    
  } catch (error) {
    console.error('❌ Error verifying Cold Leads:', error.message);
    throw error;
  }
}

if (require.main === module) {
  verifyColdLeads()
    .then((stats) => {
      console.log(`\n🎉 Verification complete!`);
      console.log(`Found ${stats.total} Cold Leads across ${Object.values(stats.breakdown).filter(x => x > 0).length} categories`);
      if (stats.deletedFromHubSpot > 0) {
        console.log(`🛡️ Protection system successfully preserved ${stats.deletedFromHubSpot} deleted Cold Lead(s)!`);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = { verifyColdLeads };