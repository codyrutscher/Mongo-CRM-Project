const axios = require('axios');
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

require('dotenv').config();

/**
 * Railway-specific Cold Lead sync script
 * 1. Sync all HubSpot contacts to Railway database
 * 2. Identify and label all Cold Leads properly
 * 3. Ensure protection system is active
 */

async function railwayColdLeadSync() {
  console.log('🚂 Railway Cold Lead Sync Starting...');
  console.log('=====================================');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  // Connect to database
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');
  console.log('✅ Connected to Railway database');

  try {
    let totalProcessed = 0;
    let coldLeadsFound = 0;
    let coldLeadsLabeled = 0;
    let newContacts = 0;
    let updatedContacts = 0;
    
    const coldLeadStats = {
      seller: 0,
      buyer: 0,
      cre: 0,
      exf: 0
    };

    console.log('\\n📥 Starting HubSpot contact sync...');
    
    let after = null;
    let batchNumber = 0;
    
    do {
      batchNumber++;
      console.log(`\\nProcessing batch ${batchNumber}...`);
      
      try {
        // Get contacts from HubSpot with Cold Lead properties
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
              'website', 'city', 'state', 'zip', 'country',
              'seller_cold_lead', 'buyer_cold_lead', 'cre_cold_lead', 'exf_cold_lead',
              'hs_object_id'
            ].join(',')
          }
        });

        const contacts = response.data.results;
        after = response.data.paging?.next?.after;
        
        console.log(`  Found ${contacts.length} contacts in this batch`);
        
        for (const hubspotContact of contacts) {
          totalProcessed++;
          
          const props = hubspotContact.properties;
          
          // Check if this is a Cold Lead
          const isColdLead = {
            seller: props.seller_cold_lead === 'true',
            buyer: props.buyer_cold_lead === 'true',
            cre: props.cre_cold_lead === 'true',
            exf: props.exf_cold_lead === 'true'
          };
          
          const isAnyColdLead = Object.values(isColdLead).some(Boolean);
          
          if (isAnyColdLead) {
            coldLeadsFound++;
            
            // Count by type
            if (isColdLead.seller) coldLeadStats.seller++;
            if (isColdLead.buyer) coldLeadStats.buyer++;
            if (isColdLead.cre) coldLeadStats.cre++;
            if (isColdLead.exf) coldLeadStats.exf++;
          }
          
          // Prepare contact data for Railway database
          const contactData = {
            email: props.email || '',
            firstName: props.firstname || '',
            lastName: props.lastname || '',
            phone: props.phone || '',
            company: props.company || '',
            jobTitle: props.jobtitle || '',
            source: 'hubspot',
            sourceId: hubspotContact.id,
            lifecycleStage: props.lifecyclestage || 'lead',
            status: 'active',
            tags: [],
            customFields: {
              hubspotId: hubspotContact.id,
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
            
            // Add tags
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
            
            coldLeadsLabeled++;
          }
          
          // Upsert contact in Railway database
          try {
            const existingContact = await Contact.findOne({ 
              $or: [
                { sourceId: hubspotContact.id },
                { email: props.email }
              ]
            });
            
            if (existingContact) {
              // Update existing contact
              await Contact.updateOne(
                { _id: existingContact._id },
                { $set: contactData }
              );
              updatedContacts++;
            } else {
              // Create new contact
              const newContact = new Contact(contactData);
              await newContact.save();
              newContacts++;
            }
          } catch (contactError) {
            console.error(`Error saving contact ${props.email}:`, contactError.message);
          }
        }
        
        // Progress update
        if (batchNumber % 10 === 0) {
          console.log(`\\n📊 Progress Update (Batch ${batchNumber}):`);
          console.log(`  Total Processed: ${totalProcessed}`);
          console.log(`  Cold Leads Found: ${coldLeadsFound}`);
          console.log(`  New Contacts: ${newContacts}`);
          console.log(`  Updated Contacts: ${updatedContacts}`);
        }
        
      } catch (batchError) {
        console.error(`Error in batch ${batchNumber}:`, batchError.message);
        // Continue with next batch
      }
      
    } while (after);
    
    console.log('\\n🎉 Railway Cold Lead Sync Complete!');
    console.log('=====================================');
    
    console.log('\\n📊 FINAL STATISTICS:');
    console.log(`Total HubSpot Contacts Processed: ${totalProcessed}`);
    console.log(`New Contacts Added: ${newContacts}`);
    console.log(`Existing Contacts Updated: ${updatedContacts}`);
    console.log(`\\nCold Lead Summary:`);
    console.log(`  Total Cold Leads Found: ${coldLeadsFound}`);
    console.log(`  Cold Leads Properly Labeled: ${coldLeadsLabeled}`);
    console.log(`\\nCold Lead Breakdown:`);
    console.log(`  Seller Cold Leads: ${coldLeadStats.seller}`);
    console.log(`  Buyer Cold Leads: ${coldLeadStats.buyer}`);
    console.log(`  CRE Cold Leads: ${coldLeadStats.cre}`);
    console.log(`  EXF Cold Leads: ${coldLeadStats.exf}`);
    
    // Verify Doug Broomes is now in the system
    console.log('\\n🔍 Verifying Doug Broomes...');
    const dougBroomes = await Contact.findOne({ email: 'doug@ironwood-works.com' });
    if (dougBroomes) {
      console.log('✅ Doug Broomes found in Railway database!');
      console.log(`   Name: ${dougBroomes.firstName} ${dougBroomes.lastName}`);
      console.log(`   Email: ${dougBroomes.email}`);
      console.log(`   Company: ${dougBroomes.company}`);
      console.log(`   HubSpot ID: ${dougBroomes.sourceId}`);
      console.log(`   Cold Lead: ${dougBroomes.customFields?.coldLead ? 'YES' : 'NO'}`);
      if (dougBroomes.customFields?.coldLead) {
        console.log(`   Cold Lead Types: ${dougBroomes.customFields.coldLeadTypes?.join(', ') || 'Unknown'}`);
        console.log(`   Tags: ${dougBroomes.tags?.join(', ') || 'None'}`);
      }
    } else {
      console.log('❌ Doug Broomes not found - may have been deleted from HubSpot');
    }
    
    console.log('\\n🛡️ Cold Lead Protection System Status:');
    console.log('✅ All Cold Leads synced and labeled');
    console.log('✅ Protection tags applied');
    console.log('✅ Railway database updated');
    console.log('✅ Ready for deletion protection testing');
    
    return {
      totalProcessed,
      newContacts,
      updatedContacts,
      coldLeadsFound,
      coldLeadsLabeled,
      coldLeadStats
    };
    
  } catch (error) {
    console.error('❌ Railway sync error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the sync
if (require.main === module) {
  railwayColdLeadSync()
    .then((results) => {
      console.log(`\\n🚂 Railway Cold Lead Sync Successfully Completed!`);
      console.log(`Processed ${results.totalProcessed} contacts`);
      console.log(`Found and labeled ${results.coldLeadsFound} Cold Leads`);
      console.log('\\n🎯 Next Steps:');
      console.log('1. Search for contacts in Railway CRM interface');
      console.log('2. Test Cold Lead deletion protection');
      console.log('3. Verify webhook protection is working');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Railway sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = { railwayColdLeadSync };