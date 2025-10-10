const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');
const fs = require('fs');

require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

/**
 * Weekly Cold Lead Cleanup Process
 * 
 * 1. Export all Cold Leads to CSV
 * 2. Optionally delete them from HubSpot (with confirmation)
 * 3. Keep them in Prospere CRM for records
 * 
 * Usage:
 *   node scripts/weekly-cold-lead-cleanup.js --export-only
 *   node scripts/weekly-cold-lead-cleanup.js --export-and-delete
 */

async function weeklyColdLeadCleanup(options = {}) {
  console.log('🗓️ Weekly Cold Lead Cleanup Process');
  console.log('=====================================\n');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  try {
    // Step 1: Get all Cold Leads from our database
    console.log('📊 Step 1: Finding Cold Leads in Prospere CRM...');
    
    const coldLeads = await Contact.find({
      source: 'hubspot',
      'customFields.coldLead': true,
      status: { $ne: 'deleted' }
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${coldLeads.length} Cold Lead contacts in Prospere CRM`);
    
    if (coldLeads.length === 0) {
      console.log('No Cold Leads to process');
      return;
    }
    
    // Show breakdown
    const sellerCount = coldLeads.filter(c => c.customFields?.sellerColdLead).length;
    const buyerCount = coldLeads.filter(c => c.customFields?.buyerColdLead).length;
    const creCount = coldLeads.filter(c => c.customFields?.creColdLead).length;
    const exfCount = coldLeads.filter(c => c.customFields?.exfColdLead).length;
    
    console.log(`\nBreakdown:`);
    console.log(`  Seller Cold Leads: ${sellerCount}`);
    console.log(`  Buyer Cold Leads: ${buyerCount}`);
    console.log(`  CRE Cold Leads: ${creCount}`);
    console.log(`  EXF Cold Leads: ${exfCount}`);
    
    // Step 2: Export to CSV
    console.log('\n📄 Step 2: Exporting Cold Leads to CSV...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    const csvFilename = `cold-leads-weekly-export-${timestamp}.csv`;
    
    const csvHeader = 'HubSpot ID,Email,First Name,Last Name,Phone,Company,Cold Lead Types,Seller,Buyer,CRE,EXF,Created Date,Last Synced\n';
    const csvRows = coldLeads.map(contact => {
      const types = contact.customFields?.coldLeadTypes?.join('; ') || '';
      return `${contact.sourceId},"${contact.email}","${contact.firstName}","${contact.lastName}","${contact.phone}","${contact.company}","${types}",${contact.customFields?.sellerColdLead || false},${contact.customFields?.buyerColdLead || false},${contact.customFields?.creColdLead || false},${contact.customFields?.exfColdLead || false},${contact.createdAt?.toISOString() || ''},${contact.lastSyncedAt?.toISOString() || ''}`;
    }).join('\n');
    
    fs.writeFileSync(csvFilename, csvHeader + csvRows);
    console.log(`✅ CSV exported: ${csvFilename}`);
    console.log(`   Contains ${coldLeads.length} Cold Lead contacts`);
    
    // Step 3: Delete from HubSpot (if requested)
    if (options.deleteFromHubSpot) {
      console.log('\n🗑️ Step 3: Deleting Cold Leads from HubSpot...');
      console.log('⚠️ WARNING: This will delete contacts from HubSpot!');
      console.log('They will be moved to "Recently Deleted" (90-day recovery period)');
      console.log('They will remain in Prospere CRM for your records.');
      
      if (!options.confirmed) {
        console.log('\n❌ Deletion not confirmed. Run with --confirmed flag to proceed.');
        console.log('Example: node scripts/weekly-cold-lead-cleanup.js --export-and-delete --confirmed');
        return;
      }
      
      console.log('\nProceeding with deletion in 5 seconds... (Ctrl+C to cancel)');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      let deleted = 0;
      let failed = 0;
      const errors = [];
      
      for (const contact of coldLeads) {
        try {
          await axios.delete(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contact.sourceId}`,
            {
              headers: {
                'Authorization': `Bearer ${hubspotToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          deleted++;
          
          // Mark as deleted in HubSpot but keep in Prospere CRM
          contact.customFields = contact.customFields || {};
          contact.customFields.deletedFromHubSpot = true;
          contact.customFields.deletedFromHubSpotDate = new Date().toISOString();
          await contact.save();
          
          if (deleted % 10 === 0) {
            console.log(`  Deleted ${deleted}/${coldLeads.length} contacts...`);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          failed++;
          errors.push({
            contactId: contact.sourceId,
            email: contact.email,
            error: error.response?.data?.message || error.message
          });
        }
      }
      
      console.log(`\n✅ Deletion complete:`);
      console.log(`   Successfully deleted: ${deleted}`);
      console.log(`   Failed: ${failed}`);
      
      if (errors.length > 0) {
        console.log(`\n❌ Errors (first 10):`);
        errors.slice(0, 10).forEach(err => {
          console.log(`   ${err.email} (${err.contactId}): ${err.error}`);
        });
      }
      
    } else {
      console.log('\n📋 Step 3: Skipping HubSpot deletion (export only mode)');
      console.log('To delete from HubSpot, run with --export-and-delete --confirmed');
    }
    
    // Summary
    console.log('\n📊 Weekly Cleanup Summary:');
    console.log(`✅ CSV exported: ${csvFilename}`);
    console.log(`✅ Cold Leads in Prospere CRM: ${coldLeads.length}`);
    if (options.deleteFromHubSpot && options.confirmed) {
      console.log(`✅ Deleted from HubSpot: Check above for details`);
    } else {
      console.log(`ℹ️  Cold Leads remain in HubSpot (export only)`);
    }
    
  } catch (error) {
    console.error('Error during weekly cleanup:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const exportOnly = args.includes('--export-only');
const exportAndDelete = args.includes('--export-and-delete');
const confirmed = args.includes('--confirmed');

if (args.includes('--help')) {
  console.log(`
Weekly Cold Lead Cleanup Tool

Usage:
  node scripts/weekly-cold-lead-cleanup.js [options]

Options:
  --export-only           Export Cold Leads to CSV only (default)
  --export-and-delete     Export to CSV and delete from HubSpot
  --confirmed             Confirm deletion (required with --export-and-delete)
  --help                  Show this help message

Examples:
  # Export only (safe, no deletion)
  node scripts/weekly-cold-lead-cleanup.js --export-only
  
  # Export and delete (requires confirmation)
  node scripts/weekly-cold-lead-cleanup.js --export-and-delete --confirmed

Notes:
  - Cold Leads are always kept in Prospere CRM
  - Deletion from HubSpot moves contacts to "Recently Deleted" (90-day recovery)
  - CSV export includes all Cold Lead data for your records
  `);
  process.exit(0);
}

// Run the cleanup
const options = {
  deleteFromHubSpot: exportAndDelete,
  confirmed: confirmed
};

weeklyColdLeadCleanup(options)
  .then(() => {
    console.log('\n✅ Weekly Cold Lead cleanup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });