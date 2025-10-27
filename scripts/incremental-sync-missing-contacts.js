const axios = require('axios');
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

require('dotenv').config();

// Map HubSpot lifecycle stages to Railway enum values
const LIFECYCLE_STAGE_MAP = {
  'subscriber': 'subscriber',
  'lead': 'lead',
  'marketingqualifiedlead': 'lead',
  'salesqualifiedlead': 'prospect',
  'opportunity': 'prospect',
  'customer': 'customer',
  'evangelist': 'evangelist',
  'other': 'lead',
  // Handle numeric IDs from HubSpot
  '250034505': 'lead',
  '1136834745': 'prospect',
  '1136936881': 'prospect'
};

/**
 * Incremental sync to add missing contacts from HubSpot to Railway
 * Finds contacts in HubSpot that don't exist in Railway and adds them
 */

async function incrementalSyncMissingContacts() {
  console.log('🔄 Incremental Sync: Adding Missing Contacts from HubSpot');
  console.log('=========================================================');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  const railwayMongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;
  await mongoose.connect(railwayMongoUri);
  console.log('✅ Connected to Railway database');

  try {
    // Get all HubSpot IDs currently in Railway
    console.log('\n📋 Getting existing HubSpot IDs from Railway...');
    const existingContacts = await Contact.find(
      { source: 'hubspot' },
      { sourceId: 1 }
    ).lean();
    
    const existingHubSpotIds = new Set(existingContacts.map(c => c.sourceId));
    console.log(`Found ${existingHubSpotIds.size} existing HubSpot contacts in Railway`);

    // Fetch all contacts from HubSpot
    console.log('\n📥 Fetching all contacts from HubSpot...');
    let allHubSpotContacts = [];
    let after = null;
    let batchNumber = 0;
    
    do {
      batchNumber++;
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 100,
          after: after,
          properties: [
            'firstname', 'lastname', 'email', 'phone', 'company',
            'jobtitle', 'lifecyclestage', 'createdate', 'lastmodifieddate',
            'seller_cold_lead', 'buyer_cold_lead', 'cre_cold_lead', 'exf_cold_lead',
            'hs_object_id'
          ].join(',')
        }
      });

      allHubSpotContacts.push(...response.data.results);
      after = response.data.paging?.next?.after;
      
      if (batchNumber % 100 === 0) {
        console.log(`  Fetched ${allHubSpotContacts.length} contacts from HubSpot...`);
      }
    } while (after);
    
    console.log(`✅ Fetched ${allHubSpotContacts.length} total contacts from HubSpot`);

    // Find missing contacts
    console.log('\n🔍 Identifying missing contacts...');
    const missingContacts = allHubSpotContacts.filter(contact => 
      !existingHubSpotIds.has(contact.id)
    );
    
    console.log(`Found ${missingContacts.length} contacts in HubSpot that are missing from Railway`);

    if (missingContacts.length === 0) {
      console.log('✅ No missing contacts - systems are in sync!');
      return { added: 0, total: allHubSpotContacts.length };
    }

    // Add missing contacts
    console.log('\n➕ Adding missing contacts to Railway...');
    let added = 0;
    let coldLeadsAdded = 0;
    
    for (const hubspotContact of missingContacts) {
      try {
        const props = hubspotContact.properties;
        
        // Check if this is a Cold Lead
        const isColdLead = {
          seller: props.seller_cold_lead === 'true',
          buyer: props.buyer_cold_lead === 'true',
          cre: props.cre_cold_lead === 'true',
          exf: props.exf_cold_lead === 'true'
        };
        
        const isAnyColdLead = Object.values(isColdLead).some(Boolean);
        
        // Map lifecycle stage to valid enum value
        const rawLifecycleStage = props.lifecyclestage || 'lead';
        const mappedLifecycleStage = LIFECYCLE_STAGE_MAP[rawLifecycleStage.toLowerCase()] || 
                                     LIFECYCLE_STAGE_MAP[rawLifecycleStage] || 
                                     'lead';
        
        // Prepare contact data
        const contactData = {
          email: props.email || '',
          firstName: props.firstname || '',
          lastName: props.lastname || '',
          phone: props.phone || '',
          company: props.company || '',
          jobTitle: props.jobtitle || '',
          source: 'hubspot',
          sourceId: hubspotContact.id,
          lifecycleStage: mappedLifecycleStage,
          status: 'active',
          tags: [],
          customFields: {
            hubspotId: hubspotContact.id,
            originalLifecycleStage: rawLifecycleStage,
            lastSyncedAt: new Date().toISOString()
          },
          createdAt: props.createdate ? new Date(props.createdate) : new Date(),
          updatedAt: props.lastmodifieddate ? new Date(props.lastmodifieddate) : new Date()
        };
        
        // Add Cold Lead properties and tags
        if (isAnyColdLead) {
          contactData.customFields.coldLead = true;
          contactData.customFields.coldLeadTypes = [];
          contactData.customFields.sellerColdLead = isColdLead.seller;
          contactData.customFields.buyerColdLead = isColdLead.buyer;
          contactData.customFields.creColdLead = isColdLead.cre;
          contactData.customFields.exfColdLead = isColdLead.exf;
          contactData.customFields.coldLeadSyncDate = new Date().toISOString();
          
          contactData.tags.push('Cold Lead');
          if (isColdLead.seller) {
            contactData.customFields.coldLeadTypes.push('Seller');
            contactData.tags.push('Cold Lead - Seller');
          }
          if (isColdLead.buyer) {
            contactData.customFields.coldLeadTypes.push('Buyer');
            contactData.tags.push('Cold Lead - Buyer');
          }
          if (isColdLead.cre) {
            contactData.customFields.coldLeadTypes.push('CRE');
            contactData.tags.push('Cold Lead - CRE');
          }
          if (isColdLead.exf) {
            contactData.customFields.coldLeadTypes.push('EXF');
            contactData.tags.push('Cold Lead - EXF');
          }
          
          coldLeadsAdded++;
        }
        
        const newContact = new Contact(contactData);
        await newContact.save();
        added++;
        
        if (added % 10 === 0) {
          console.log(`  Added ${added}/${missingContacts.length} contacts...`);
        }
        
      } catch (error) {
        console.error(`Error adding contact ${hubspotContact.id}:`, error.message);
      }
    }
    
    console.log(`✅ Added ${added} missing contacts to Railway`);
    if (coldLeadsAdded > 0) {
      console.log(`   Including ${coldLeadsAdded} Cold Leads`);
    }

    // Final count check
    console.log('\n📊 Final Count Verification:');
    const finalRailwayCount = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`Railway CRM: ${finalRailwayCount} contacts`);
    console.log(`HubSpot: ${allHubSpotContacts.length} contacts`);
    console.log(`Difference: ${Math.abs(finalRailwayCount - allHubSpotContacts.length)}`);
    
    if (finalRailwayCount === allHubSpotContacts.length) {
      console.log('\n🎉 SUCCESS! Systems are now perfectly synchronized!');
    } else {
      console.log('\n⚠️  Small difference may be due to timing or contacts being added/deleted during sync');
    }
    
    return {
      added,
      coldLeadsAdded,
      finalRailwayCount,
      hubspotCount: allHubSpotContacts.length
    };
    
  } catch (error) {
    console.error('❌ Error during incremental sync:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from Railway database');
  }
}

// Run the sync
if (require.main === module) {
  incrementalSyncMissingContacts()
    .then((results) => {
      console.log('\n🎯 Incremental Sync Complete!');
      console.log(`Added ${results.added} contacts (${results.coldLeadsAdded} Cold Leads)`);
      console.log(`Final Railway count: ${results.finalRailwayCount}`);
      console.log(`HubSpot count: ${results.hubspotCount}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Incremental sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = { incrementalSyncMissingContacts };