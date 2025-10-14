const axios = require('axios');

require('dotenv').config();

/**
 * Delete a Cold Lead contact from HubSpot to test the protection system
 * 
 * Usage:
 *   node scripts/delete-hubspot-cold-lead.js --email test@example.com
 *   node scripts/delete-hubspot-cold-lead.js --id 12345
 *   node scripts/delete-hubspot-cold-lead.js --list-cold-leads
 */

async function deleteHubSpotColdLead() {
  console.log('🗑️ HubSpot Cold Lead Deletion Tester');
  console.log('=====================================');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length === 0) {
    console.log(`
HubSpot Cold Lead Deletion Tester

Usage:
  node scripts/delete-hubspot-cold-lead.js [options]

Options:
  --email <email>         Delete contact by email address
  --id <hubspot_id>       Delete contact by HubSpot ID
  --list-cold-leads       List all Cold Leads in HubSpot
  --help                  Show this help message

Examples:
  # List all Cold Leads in HubSpot
  node scripts/delete-hubspot-cold-lead.js --list-cold-leads
  
  # Delete by email
  node scripts/delete-hubspot-cold-lead.js --email coldlead.test.123@example.com
  
  # Delete by HubSpot ID
  node scripts/delete-hubspot-cold-lead.js --id 12345678
    `);
    return;
  }

  try {
    // List Cold Leads option
    if (args.includes('--list-cold-leads')) {
      await listColdLeads(hubspotToken);
      return;
    }

    // Get contact identifier
    let contactId = null;
    let contactEmail = null;
    
    const emailIndex = args.indexOf('--email');
    const idIndex = args.indexOf('--id');
    
    if (emailIndex !== -1 && emailIndex + 1 < args.length) {
      contactEmail = args[emailIndex + 1];
      console.log(`🔍 Finding contact by email: ${contactEmail}`);
      contactId = await findContactByEmail(hubspotToken, contactEmail);
    } else if (idIndex !== -1 && idIndex + 1 < args.length) {
      contactId = args[idIndex + 1];
      console.log(`🔍 Using HubSpot ID: ${contactId}`);
    } else {
      throw new Error('Please provide either --email <email> or --id <hubspot_id>');
    }

    if (!contactId) {
      throw new Error('Contact not found or invalid ID provided');
    }

    // Get contact details before deletion
    console.log('\n📋 Getting contact details before deletion...');
    const contactDetails = await getContactDetails(hubspotToken, contactId);
    
    // Check if it's actually a Cold Lead
    const isColdLead = checkIfColdLead(contactDetails);
    if (!isColdLead.isAny) {
      console.log('⚠️  WARNING: This contact is NOT marked as a Cold Lead!');
      console.log('Cold Lead properties:');
      Object.entries(isColdLead.types).forEach(([type, value]) => {
        console.log(`  ${type}: ${value}`);
      });
      console.log('\nDo you want to continue anyway? (This won\'t test the Cold Lead protection)');
      // For automation, we'll continue but warn
    } else {
      console.log('✅ Confirmed: This is a Cold Lead contact');
      console.log('Cold Lead types:', isColdLead.activeTypes.join(', '));
    }

    console.log('\n📊 Contact Details:');
    console.log(`Name: ${contactDetails.properties.firstname || 'N/A'} ${contactDetails.properties.lastname || 'N/A'}`);
    console.log(`Email: ${contactDetails.properties.email || 'N/A'}`);
    console.log(`Company: ${contactDetails.properties.company || 'N/A'}`);
    console.log(`HubSpot ID: ${contactId}`);
    console.log(`Created: ${new Date(contactDetails.createdAt).toLocaleString()}`);

    // Delete the contact
    console.log('\n🗑️ Deleting contact from HubSpot...');
    await deleteContact(hubspotToken, contactId);
    
    console.log('✅ Contact successfully deleted from HubSpot!');
    
    console.log('\n🎯 What should happen next:');
    console.log('1. HubSpot webhook should fire for the contact deletion');
    console.log('2. Webhook should detect this was a Cold Lead');
    console.log('3. Contact should be PRESERVED in Prospere CRM');
    console.log('4. Contact should be marked as "deleted from HubSpot"');
    
    console.log('\n📋 To verify the protection worked:');
    console.log('1. Wait 30 seconds for webhook processing');
    console.log('2. Run: node scripts/manage-deleted-cold-leads.js --list');
    console.log('3. The contact should appear in the "deleted from HubSpot" list');
    console.log('4. Contact should still be searchable in Prospere CRM');
    
    console.log('\n🔍 To check HubSpot (should be gone):');
    console.log(`1. Visit: https://app.hubspot.com/contacts/your-hub-id/contact/${contactId}`);
    console.log('2. Contact should show as deleted/not found');
    
    return {
      deletedContactId: contactId,
      deletedContactEmail: contactDetails.properties.email,
      deletedContactName: `${contactDetails.properties.firstname || ''} ${contactDetails.properties.lastname || ''}`.trim(),
      wasColdLead: isColdLead.isAny,
      coldLeadTypes: isColdLead.activeTypes
    };
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔑 Authentication Error:');
      console.log('- Check your HUBSPOT_ACCESS_TOKEN in .env file');
      console.log('- Ensure the token has crm.objects.contacts.write scope');
    } else if (error.response?.status === 404) {
      console.log('\n🔍 Contact Not Found:');
      console.log('- The contact may already be deleted');
      console.log('- Check the email address or HubSpot ID');
      console.log('- Run --list-cold-leads to see available contacts');
    }
    
    throw error;
  }
}

async function listColdLeads(hubspotToken) {
  console.log('📋 Listing Cold Leads in HubSpot...\n');
  
  try {
    const response = await axios.get(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          properties: 'firstname,lastname,email,company,seller_cold_lead,buyer_cold_lead,cre_cold_lead,exf_cold_lead',
          limit: 100
        }
      }
    );
    
    const contacts = response.data.results;
    const coldLeads = contacts.filter(contact => {
      const props = contact.properties;
      return props.seller_cold_lead === 'true' || 
             props.buyer_cold_lead === 'true' || 
             props.cre_cold_lead === 'true' || 
             props.exf_cold_lead === 'true';
    });
    
    if (coldLeads.length === 0) {
      console.log('❌ No Cold Leads found in HubSpot');
      console.log('\n💡 To create a test Cold Lead:');
      console.log('node scripts/create-hubspot-cold-lead.js --seller');
      return;
    }
    
    console.log(`✅ Found ${coldLeads.length} Cold Lead(s):\n`);
    
    coldLeads.forEach((contact, index) => {
      const props = contact.properties;
      const types = [];
      if (props.seller_cold_lead === 'true') types.push('Seller');
      if (props.buyer_cold_lead === 'true') types.push('Buyer');
      if (props.cre_cold_lead === 'true') types.push('CRE');
      if (props.exf_cold_lead === 'true') types.push('EXF');
      
      console.log(`${index + 1}. ${props.firstname || 'N/A'} ${props.lastname || 'N/A'}`);
      console.log(`   Email: ${props.email || 'N/A'}`);
      console.log(`   Company: ${props.company || 'N/A'}`);
      console.log(`   HubSpot ID: ${contact.id}`);
      console.log(`   Cold Lead Types: ${types.join(', ')}`);
      console.log(`   Created: ${new Date(contact.createdAt).toLocaleString()}`);
      console.log('');
    });
    
    console.log('🗑️ To delete one of these contacts:');
    console.log(`node scripts/delete-hubspot-cold-lead.js --id ${coldLeads[0].id}`);
    console.log(`node scripts/delete-hubspot-cold-lead.js --email ${coldLeads[0].properties.email}`);
    
  } catch (error) {
    console.error('❌ Error listing contacts:', error.response?.data || error.message);
    throw error;
  }
}

async function findContactByEmail(hubspotToken, email) {
  try {
    const response = await axios.get(
      `https://api.hubapi.com/crm/v3/objects/contacts/${email}`,
      {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          idProperty: 'email',
          properties: 'firstname,lastname,email'
        }
      }
    );
    
    return response.data.id;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`Contact with email ${email} not found in HubSpot`);
    }
    throw error;
  }
}

async function getContactDetails(hubspotToken, contactId) {
  try {
    const response = await axios.get(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
      {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          properties: 'firstname,lastname,email,company,seller_cold_lead,buyer_cold_lead,cre_cold_lead,exf_cold_lead'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`Contact with ID ${contactId} not found in HubSpot`);
    }
    throw error;
  }
}

function checkIfColdLead(contactDetails) {
  const props = contactDetails.properties;
  const types = {
    seller_cold_lead: props.seller_cold_lead === 'true',
    buyer_cold_lead: props.buyer_cold_lead === 'true',
    cre_cold_lead: props.cre_cold_lead === 'true',
    exf_cold_lead: props.exf_cold_lead === 'true'
  };
  
  const activeTypes = Object.entries(types)
    .filter(([key, value]) => value)
    .map(([key]) => key.replace('_cold_lead', '').toUpperCase());
  
  return {
    isAny: Object.values(types).some(Boolean),
    types: types,
    activeTypes: activeTypes
  };
}

async function deleteContact(hubspotToken, contactId) {
  try {
    await axios.delete(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
      {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`Contact with ID ${contactId} not found or already deleted`);
    }
    throw error;
  }
}

// Run the deletion
if (require.main === module) {
  deleteHubSpotColdLead()
    .then((result) => {
      if (result) {
        console.log(`\n🎉 HubSpot deletion test complete!`);
        console.log(`Deleted: ${result.deletedContactName} (${result.deletedContactEmail})`);
        console.log(`HubSpot ID: ${result.deletedContactId}`);
        console.log(`Was Cold Lead: ${result.wasColdLead ? 'Yes' : 'No'}`);
        if (result.wasColdLead) {
          console.log(`Cold Lead Types: ${result.coldLeadTypes.join(', ')}`);
        }
        console.log('\n⏳ Wait 30 seconds, then check if it was preserved in Prospere CRM!');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Deletion test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { deleteHubSpotColdLead };