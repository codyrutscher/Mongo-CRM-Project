const axios = require('axios');
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

/**
 * Delete contacts from HubSpot by their IDs
 * 
 * Usage examples:
 * 1. Delete specific contact IDs:
 *    node scripts/delete-hubspot-contacts.js --ids 123,456,789
 * 
 * 2. Delete contacts matching criteria (e.g., test contacts):
 *    node scripts/delete-hubspot-contacts.js --test-contacts
 * 
 * 3. Delete contacts from a list of IDs in a file:
 *    node scripts/delete-hubspot-contacts.js --file contact-ids.txt
 */

async function deleteHubSpotContacts(contactIds, options = {}) {
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  console.log(`🗑️ Preparing to delete ${contactIds.length} contacts from HubSpot...`);
  
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No contacts will actually be deleted');
  }
  
  let deleted = 0;
  let failed = 0;
  const errors = [];

  for (const contactId of contactIds) {
    try {
      console.log(`Deleting contact ${contactId}...`);
      
      if (!options.dryRun) {
        const response = await axios.delete(
          `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
          {
            headers: {
              'Authorization': `Bearer ${hubspotToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.status === 204) {
          deleted++;
          console.log(`  ✅ Deleted contact ${contactId}`);
          
          // Also mark as deleted in our database
          await Contact.updateOne(
            { source: 'hubspot', sourceId: contactId },
            { 
              $set: { 
                status: 'deleted',
                lastSyncedAt: new Date()
              }
            }
          );
        }
      } else {
        console.log(`  🔍 Would delete contact ${contactId}`);
        deleted++;
      }
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      failed++;
      const errorMsg = error.response?.data?.message || error.message;
      console.log(`  ❌ Failed to delete contact ${contactId}: ${errorMsg}`);
      errors.push({ contactId, error: errorMsg });
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`Successfully deleted: ${deleted}`);
  console.log(`Failed: ${failed}`);
  
  if (errors.length > 0) {
    console.log(`\n❌ Errors:`);
    errors.forEach(err => {
      console.log(`  Contact ${err.contactId}: ${err.error}`);
    });
  }
  
  return { deleted, failed, errors };
}

async function findTestContacts() {
  console.log('🔍 Finding test contacts in database...');
  
  const testContacts = await Contact.find({
    source: 'hubspot',
    $or: [
      { firstName: { $regex: /test/i } },
      { lastName: { $regex: /test/i } },
      { email: { $regex: /test/i } },
      { firstName: { $regex: /hubspot/i } },
      { lastName: { $regex: /hubspot/i } }
    ]
  }, 'sourceId firstName lastName email');
  
  console.log(`Found ${testContacts.length} test contacts`);
  
  testContacts.slice(0, 10).forEach((contact, index) => {
    console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
  });
  
  if (testContacts.length > 10) {
    console.log(`  ... and ${testContacts.length - 10} more`);
  }
  
  return testContacts.map(c => c.sourceId);
}

async function main() {
  const args = process.argv.slice(2);
  
  let contactIds = [];
  let dryRun = args.includes('--dry-run');
  
  if (args.includes('--help')) {
    console.log(`
HubSpot Contact Deletion Tool

Usage:
  node scripts/delete-hubspot-contacts.js [options]

Options:
  --ids <id1,id2,id3>     Delete specific contact IDs (comma-separated)
  --test-contacts         Find and delete test contacts
  --dry-run              Show what would be deleted without actually deleting
  --help                 Show this help message

Examples:
  # Delete specific contacts (dry run first)
  node scripts/delete-hubspot-contacts.js --ids 123,456,789 --dry-run
  
  # Actually delete them
  node scripts/delete-hubspot-contacts.js --ids 123,456,789
  
  # Find and delete test contacts (dry run)
  node scripts/delete-hubspot-contacts.js --test-contacts --dry-run
  
  # Actually delete test contacts
  node scripts/delete-hubspot-contacts.js --test-contacts

Note: Deleted contacts go to "Recently Deleted" in HubSpot and can be restored within 90 days.
    `);
    process.exit(0);
  }
  
  if (args.includes('--ids')) {
    const idsIndex = args.indexOf('--ids');
    const idsString = args[idsIndex + 1];
    contactIds = idsString.split(',').map(id => id.trim());
    console.log(`📋 Contact IDs to delete: ${contactIds.join(', ')}`);
  } else if (args.includes('--test-contacts')) {
    contactIds = await findTestContacts();
    
    if (contactIds.length === 0) {
      console.log('No test contacts found');
      process.exit(0);
    }
    
    console.log(`\n⚠️ WARNING: About to delete ${contactIds.length} test contacts from HubSpot!`);
    
    if (!dryRun) {
      console.log('This will move them to "Recently Deleted" (90-day recovery period)');
      console.log('Run with --dry-run first to preview what will be deleted');
      console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } else {
    console.log('❌ Error: Must specify --ids or --test-contacts');
    console.log('Run with --help for usage information');
    process.exit(1);
  }
  
  if (contactIds.length === 0) {
    console.log('No contacts to delete');
    process.exit(0);
  }
  
  const result = await deleteHubSpotContacts(contactIds, { dryRun });
  
  console.log('\n✅ Deletion process complete');
  
  await mongoose.disconnect();
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = { deleteHubSpotContacts, findTestContacts };