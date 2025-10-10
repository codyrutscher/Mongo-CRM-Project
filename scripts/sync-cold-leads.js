const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');
const fs = require('fs');

require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

/**
 * Sync Cold Lead contacts from HubSpot to Prospere CRM
 * 
 * Cold Lead Properties:
 * - seller_cold_lead
 * - buyer_cold_lead
 * - cre_cold_lead
 * - exf_cold_lead
 */

async function syncColdLeads() {
  console.log('🔄 Syncing Cold Lead contacts from HubSpot...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  try {
    let after = undefined;
    let batchNumber = 1;
    let totalColdLeads = 0;
    let newColdLeads = 0;
    let existingColdLeads = 0;
    const coldLeadContacts = [];

    console.log('\n📥 Fetching contacts with Cold Lead properties from HubSpot...');

    while (batchNumber <= 1400) {
      try {
        console.log(`\nProcessing batch ${batchNumber}...`);
        
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            limit: 100,
            properties: 'email,firstname,lastname,phone,company,seller_cold_lead,buyer_cold_lead,cre_cold_lead,exf_cold_lead,createdate,lastmodifieddate',
            ...(after && { after })
          },
          timeout: 30000
        });

        const contacts = response.data.results;
        if (!contacts || contacts.length === 0) {
          console.log('No more contacts from HubSpot');
          break;
        }

        // Filter contacts that have any Cold Lead property = Yes/true
        const coldLeads = contacts.filter(contact => {
          const props = contact.properties;
          return props.seller_cold_lead === 'true' || 
                 props.seller_cold_lead === true ||
                 props.buyer_cold_lead === 'true' || 
                 props.buyer_cold_lead === true ||
                 props.cre_cold_lead === 'true' || 
                 props.cre_cold_lead === true ||
                 props.exf_cold_lead === 'true' || 
                 props.exf_cold_lead === true;
        });

        if (coldLeads.length > 0) {
          console.log(`  Found ${coldLeads.length} Cold Lead contacts in this batch`);
          
          for (const contact of coldLeads) {
            const props = contact.properties;
            
            // Determine which Cold Lead types apply
            const coldLeadTypes = [];
            if (props.seller_cold_lead === 'true' || props.seller_cold_lead === true) {
              coldLeadTypes.push('Seller');
            }
            if (props.buyer_cold_lead === 'true' || props.buyer_cold_lead === true) {
              coldLeadTypes.push('Buyer');
            }
            if (props.cre_cold_lead === 'true' || props.cre_cold_lead === true) {
              coldLeadTypes.push('CRE');
            }
            if (props.exf_cold_lead === 'true' || props.exf_cold_lead === true) {
              coldLeadTypes.push('EXF');
            }

            // Check if contact already exists in our database
            const existingContact = await Contact.findOne({
              source: 'hubspot',
              sourceId: contact.id
            });

            if (existingContact) {
              // Update existing contact with Cold Lead info
              existingContact.customFields = existingContact.customFields || {};
              existingContact.customFields.coldLead = true;
              existingContact.customFields.coldLeadTypes = coldLeadTypes;
              existingContact.customFields.sellerColdLead = props.seller_cold_lead === 'true' || props.seller_cold_lead === true;
              existingContact.customFields.buyerColdLead = props.buyer_cold_lead === 'true' || props.buyer_cold_lead === true;
              existingContact.customFields.creColdLead = props.cre_cold_lead === 'true' || props.cre_cold_lead === true;
              existingContact.customFields.exfColdLead = props.exf_cold_lead === 'true' || props.exf_cold_lead === true;
              existingContact.customFields.coldLeadSyncDate = new Date().toISOString();
              
              // Add Cold Lead tag
              if (!existingContact.tags.includes('Cold Lead')) {
                existingContact.tags.push('Cold Lead');
              }
              
              // Add specific type tags
              coldLeadTypes.forEach(type => {
                const tag = `Cold Lead - ${type}`;
                if (!existingContact.tags.includes(tag)) {
                  existingContact.tags.push(tag);
                }
              });
              
              existingContact.lastSyncedAt = new Date();
              await existingContact.save();
              
              existingColdLeads++;
            } else {
              // Create new contact
              const newContact = new Contact({
                email: props.email || '',
                firstName: props.firstname || '',
                lastName: props.lastname || '',
                phone: props.phone || '',
                company: props.company || '',
                source: 'hubspot',
                sourceId: contact.id,
                lifecycleStage: 'lead',
                leadSource: 'hubspot_cold_lead',
                tags: ['Cold Lead', ...coldLeadTypes.map(type => `Cold Lead - ${type}`)],
                customFields: {
                  coldLead: true,
                  coldLeadTypes: coldLeadTypes,
                  sellerColdLead: props.seller_cold_lead === 'true' || props.seller_cold_lead === true,
                  buyerColdLead: props.buyer_cold_lead === 'true' || props.buyer_cold_lead === true,
                  creColdLead: props.cre_cold_lead === 'true' || props.cre_cold_lead === true,
                  exfColdLead: props.exf_cold_lead === 'true' || props.exf_cold_lead === true,
                  coldLeadSyncDate: new Date().toISOString(),
                  hubspotId: contact.id
                },
                lastSyncedAt: new Date(),
                createdAt: props.createdate ? new Date(props.createdate) : new Date(),
                updatedAt: props.lastmodifieddate ? new Date(props.lastmodifieddate) : new Date()
              });
              
              await newContact.save();
              newColdLeads++;
            }
            
            totalColdLeads++;
            
            // Store for CSV export
            coldLeadContacts.push({
              id: contact.id,
              email: props.email || '',
              firstName: props.firstname || '',
              lastName: props.lastname || '',
              phone: props.phone || '',
              company: props.company || '',
              coldLeadTypes: coldLeadTypes.join(', '),
              sellerColdLead: props.seller_cold_lead === 'true' || props.seller_cold_lead === true,
              buyerColdLead: props.buyer_cold_lead === 'true' || props.buyer_cold_lead === true,
              creColdLead: props.cre_cold_lead === 'true' || props.cre_cold_lead === true,
              exfColdLead: props.exf_cold_lead === 'true' || props.exf_cold_lead === true
            });
          }
        }

        // Move to next batch
        if (response.data.paging && response.data.paging.next) {
          after = response.data.paging.next.after;
        } else {
          console.log('No more pages from HubSpot');
          break;
        }

      } catch (error) {
        if (error.response && error.response.status === 500) {
          console.log(`❌ 500 error in batch ${batchNumber}, skipping...`);
          after = after ? (parseInt(after) + 100).toString() : '100';
        } else {
          console.log(`❌ Error in batch ${batchNumber}:`, error.message);
          break;
        }
      }

      batchNumber++;
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`\n📊 Cold Lead Sync Summary:`);
    console.log(`Total Cold Leads found: ${totalColdLeads}`);
    console.log(`New Cold Leads added: ${newColdLeads}`);
    console.log(`Existing Cold Leads updated: ${existingColdLeads}`);

    // Export to CSV
    if (coldLeadContacts.length > 0) {
      const timestamp = new Date().toISOString().split('T')[0];
      const csvFilename = `cold-leads-export-${timestamp}.csv`;
      
      console.log(`\n📄 Exporting Cold Leads to CSV: ${csvFilename}`);
      
      const csvHeader = 'HubSpot ID,Email,First Name,Last Name,Phone,Company,Cold Lead Types,Seller,Buyer,CRE,EXF\n';
      const csvRows = coldLeadContacts.map(contact => 
        `${contact.id},"${contact.email}","${contact.firstName}","${contact.lastName}","${contact.phone}","${contact.company}","${contact.coldLeadTypes}",${contact.sellerColdLead},${contact.buyerColdLead},${contact.creColdLead},${contact.exfColdLead}`
      ).join('\n');
      
      fs.writeFileSync(csvFilename, csvHeader + csvRows);
      console.log(`✅ CSV exported: ${csvFilename}`);
      console.log(`   Contains ${coldLeadContacts.length} Cold Lead contacts`);
    }

    // Show breakdown by type
    console.log(`\n📊 Cold Lead Breakdown:`);
    const sellerCount = coldLeadContacts.filter(c => c.sellerColdLead).length;
    const buyerCount = coldLeadContacts.filter(c => c.buyerColdLead).length;
    const creCount = coldLeadContacts.filter(c => c.creColdLead).length;
    const exfCount = coldLeadContacts.filter(c => c.exfColdLead).length;
    
    console.log(`Seller Cold Leads: ${sellerCount}`);
    console.log(`Buyer Cold Leads: ${buyerCount}`);
    console.log(`CRE Cold Leads: ${creCount}`);
    console.log(`EXF Cold Leads: ${exfCount}`);

  } catch (error) {
    console.error('Error during Cold Lead sync:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the sync
if (require.main === module) {
  syncColdLeads()
    .then(() => {
      console.log('\n✅ Cold Lead sync complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cold Lead sync failed:', error);
      process.exit(1);
    });
}

module.exports = { syncColdLeads };