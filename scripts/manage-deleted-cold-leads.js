const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

/**
 * Manage Cold Leads that have been deleted from HubSpot
 * 
 * Usage:
 *   node scripts/manage-deleted-cold-leads.js --list
 *   node scripts/manage-deleted-cold-leads.js --stats
 *   node scripts/manage-deleted-cold-leads.js --export
 */

async function manageDeletedColdLeads() {
  console.log('🗂️ Managing Cold Leads deleted from HubSpot');
  console.log('============================================\n');

  try {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
      console.log(`
Cold Lead Deletion Management Tool

Usage:
  node scripts/manage-deleted-cold-leads.js [options]

Options:
  --list              List all Cold Leads deleted from HubSpot
  --stats             Show statistics about deleted Cold Leads
  --export            Export deleted Cold Leads to CSV
  --active            Show active Cold Leads still in HubSpot
  --all               Show all Cold Leads (active and deleted)
  --help              Show this help message

Examples:
  # Show statistics
  node scripts/manage-deleted-cold-leads.js --stats
  
  # List deleted Cold Leads
  node scripts/manage-deleted-cold-leads.js --list
  
  # Export to CSV
  node scripts/manage-deleted-cold-leads.js --export
      `);
      return;
    }

    // Get all Cold Lead contacts
    const allColdLeads = await Contact.find({
      source: 'hubspot',
      'customFields.coldLead': true
    }).sort({ createdAt: -1 });

    // Separate active vs deleted from HubSpot
    const activeColdLeads = allColdLeads.filter(c => !c.customFields?.deletedFromHubSpot);
    const deletedColdLeads = allColdLeads.filter(c => c.customFields?.deletedFromHubSpot === true);

    if (args.includes('--stats')) {
      console.log('📊 Cold Lead Statistics:');
      console.log('========================');
      console.log(`Total Cold Leads in Prospere CRM: ${allColdLeads.length}`);
      console.log(`Active in HubSpot: ${activeColdLeads.length}`);
      console.log(`Deleted from HubSpot: ${deletedColdLeads.length}`);
      
      if (deletedColdLeads.length > 0) {
        console.log('\nDeleted Cold Leads Breakdown:');
        const sellerDeleted = deletedColdLeads.filter(c => c.customFields?.sellerColdLead).length;
        const buyerDeleted = deletedColdLeads.filter(c => c.customFields?.buyerColdLead).length;
        const creDeleted = deletedColdLeads.filter(c => c.customFields?.creColdLead).length;
        const exfDeleted = deletedColdLeads.filter(c => c.customFields?.exfColdLead).length;
        
        console.log(`  Seller Cold Leads: ${sellerDeleted}`);
        console.log(`  Buyer Cold Leads: ${buyerDeleted}`);
        console.log(`  CRE Cold Leads: ${creDeleted}`);
        console.log(`  EXF Cold Leads: ${exfDeleted}`);
      }
      
      if (activeColdLeads.length > 0) {
        console.log('\nActive Cold Leads Breakdown:');
        const sellerActive = activeColdLeads.filter(c => c.customFields?.sellerColdLead).length;
        const buyerActive = activeColdLeads.filter(c => c.customFields?.buyerColdLead).length;
        const creActive = activeColdLeads.filter(c => c.customFields?.creColdLead).length;
        const exfActive = activeColdLeads.filter(c => c.customFields?.exfColdLead).length;
        
        console.log(`  Seller Cold Leads: ${sellerActive}`);
        console.log(`  Buyer Cold Leads: ${buyerActive}`);
        console.log(`  CRE Cold Leads: ${creActive}`);
        console.log(`  EXF Cold Leads: ${exfActive}`);
      }
    }

    if (args.includes('--list')) {
      if (deletedColdLeads.length === 0) {
        console.log('📋 No Cold Leads have been deleted from HubSpot yet.');
      } else {
        console.log(`📋 Cold Leads Deleted from HubSpot (${deletedColdLeads.length} total):`);
        console.log('='.repeat(60));
        
        deletedColdLeads.slice(0, 20).forEach((contact, index) => {
          const types = contact.customFields?.coldLeadTypes?.join(', ') || 'Unknown';
          const deletedDate = contact.customFields?.deletedFromHubSpotDate ? 
            new Date(contact.customFields.deletedFromHubSpotDate).toLocaleDateString() : 'Unknown';
          
          console.log(`${index + 1}. ${contact.firstName} ${contact.lastName}`);
          console.log(`   Email: ${contact.email}`);
          console.log(`   Company: ${contact.company || 'N/A'}`);
          console.log(`   Cold Lead Types: ${types}`);
          console.log(`   Deleted from HubSpot: ${deletedDate}`);
          console.log(`   HubSpot ID: ${contact.sourceId}`);
          console.log('');
        });
        
        if (deletedColdLeads.length > 20) {
          console.log(`... and ${deletedColdLeads.length - 20} more contacts`);
        }
      }
    }

    if (args.includes('--active')) {
      if (activeColdLeads.length === 0) {
        console.log('📋 No active Cold Leads in HubSpot.');
      } else {
        console.log(`📋 Active Cold Leads in HubSpot (${activeColdLeads.length} total):`);
        console.log('='.repeat(60));
        
        activeColdLeads.slice(0, 20).forEach((contact, index) => {
          const types = contact.customFields?.coldLeadTypes?.join(', ') || 'Unknown';
          
          console.log(`${index + 1}. ${contact.firstName} ${contact.lastName}`);
          console.log(`   Email: ${contact.email}`);
          console.log(`   Company: ${contact.company || 'N/A'}`);
          console.log(`   Cold Lead Types: ${types}`);
          console.log(`   HubSpot ID: ${contact.sourceId}`);
          console.log('');
        });
        
        if (activeColdLeads.length > 20) {
          console.log(`... and ${activeColdLeads.length - 20} more contacts`);
        }
      }
    }

    if (args.includes('--all')) {
      console.log(`📋 All Cold Leads in Prospere CRM (${allColdLeads.length} total):`);
      console.log('='.repeat(60));
      
      allColdLeads.slice(0, 20).forEach((contact, index) => {
        const types = contact.customFields?.coldLeadTypes?.join(', ') || 'Unknown';
        const status = contact.customFields?.deletedFromHubSpot ? '❌ Deleted from HubSpot' : '✅ Active in HubSpot';
        
        console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} - ${status}`);
        console.log(`   Email: ${contact.email}`);
        console.log(`   Company: ${contact.company || 'N/A'}`);
        console.log(`   Cold Lead Types: ${types}`);
        console.log(`   HubSpot ID: ${contact.sourceId}`);
        console.log('');
      });
      
      if (allColdLeads.length > 20) {
        console.log(`... and ${allColdLeads.length - 20} more contacts`);
      }
    }

    if (args.includes('--export')) {
      const fs = require('fs');
      const timestamp = new Date().toISOString().split('T')[0];
      const csvFilename = `deleted-cold-leads-${timestamp}.csv`;
      
      if (deletedColdLeads.length === 0) {
        console.log('📄 No deleted Cold Leads to export.');
      } else {
        const csvHeader = 'HubSpot ID,Email,First Name,Last Name,Phone,Company,Cold Lead Types,Seller,Buyer,CRE,EXF,Deleted Date,Created Date\n';
        const csvRows = deletedColdLeads.map(contact => {
          const types = contact.customFields?.coldLeadTypes?.join('; ') || '';
          const deletedDate = contact.customFields?.deletedFromHubSpotDate || '';
          return `${contact.sourceId},"${contact.email}","${contact.firstName}","${contact.lastName}","${contact.phone}","${contact.company}","${types}",${contact.customFields?.sellerColdLead || false},${contact.customFields?.buyerColdLead || false},${contact.customFields?.creColdLead || false},${contact.customFields?.exfColdLead || false},${deletedDate},${contact.createdAt?.toISOString() || ''}`;
        }).join('\n');
        
        fs.writeFileSync(csvFilename, csvHeader + csvRows);
        console.log(`📄 Exported ${deletedColdLeads.length} deleted Cold Leads to: ${csvFilename}`);
      }
    }

    // Default behavior if no specific action requested
    if (!args.some(arg => ['--list', '--stats', '--export', '--active', '--all'].includes(arg))) {
      console.log('📊 Quick Summary:');
      console.log(`Total Cold Leads: ${allColdLeads.length}`);
      console.log(`Active in HubSpot: ${activeColdLeads.length}`);
      console.log(`Deleted from HubSpot (preserved in Prospere): ${deletedColdLeads.length}`);
      console.log('\nUse --help for more options');
    }

  } catch (error) {
    console.error('Error managing deleted Cold Leads:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the management tool
manageDeletedColdLeads()
  .then(() => {
    console.log('\n✅ Cold Lead management complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Management failed:', error);
    process.exit(1);
  });