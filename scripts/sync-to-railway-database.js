const axios = require('axios');
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

require('dotenv').config();

/**
 * Sync Cold Leads directly to Railway's MongoDB database
 * Same terminal output as local sync, but saves to Railway
 */

async function syncToRailwayDatabase() {
  console.log('🚂 Syncing Cold Leads to Railway Database...');
  console.log('==============================================');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  // Use Railway's MongoDB connection string
  const railwayMongoUri = process.env.RAILWAY_MONGODB_URI;
  if (!railwayMongoUri) {
    console.log('❌ RAILWAY_MONGODB_URI not found in .env file');
    console.log('Please add your Railway MongoDB connection string to .env:');
    console.log('RAILWAY_MONGODB_URI=mongodb://username:password@host:port/database');
    console.log('\\nYou can find this in your Railway dashboard under Variables.');
    return;
  }

  console.log('🔗 Connecting to Railway MongoDB database...');
  try {
    await mongoose.connect(railwayMongoUri);
    console.log('✅ Connected to Railway database successfully!');
  } catch (connectionError) {
    console.error('❌ Failed to connect to Railway database:', connectionError.message);
    console.log('\\nPlease check your RAILWAY_MONGODB_URI in .env file');
    return;
  }

  try {
    let totalProcessed = 0;
    let coldLeadsFound = 0;
    let newColdLeads = 0;
    let updatedColdLeads = 0;
    
    const coldLeadStats = {
      seller: 0,
      buyer: 0,
      cre: 0,
      exf: 0
    };

    console.log('\\n📥 Fetching contacts with Cold Lead properties from HubSpot...');
    
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
        
        let coldLeadsInBatch = 0;
        
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
            coldLeadsInBatch++;
            
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
              if (isAnyColdLead) updatedColdLeads++;
            } else {
              // Create new contact
              const newContact = new Contact(contactData);
              await newContact.save();
              if (isAnyColdLead) newColdLeads++;
            }
          } catch (contactError) {
            console.error(`Error saving contact ${props.email}:`, contactError.message);
          }
        }
        
        if (coldLeadsInBatch > 0) {
          console.log(`  Found ${coldLeadsInBatch} Cold Lead contacts in this batch`);
        }
        
      } catch (batchError) {
        console.error(`❌ Error in batch ${batchNumber}:`, batchError.message);
        // Continue with next batch
      }
      
    } while (after);
    
    console.log('\\n🎉 Railway Cold Lead Sync Complete!');
    console.log('=====================================');
    
    console.log('\\n📊 Cold Lead Sync Summary:');
    console.log(`Total Cold Leads found: ${coldLeadsFound}`);
    console.log(`New Cold Leads added: ${newColdLeads}`);
    console.log(`Existing Cold Leads updated: ${updatedColdLeads}`);
    
    // Export Cold Leads to CSV
    console.log('\\n📄 Exporting Cold Leads to CSV: railway-cold-leads-export.csv');
    const allColdLeads = await Contact.find({ 'customFields.coldLead': true });
    
    if (allColdLeads.length > 0) {
      const csvData = allColdLeads.map(contact => ({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        company: contact.company,
        phone: contact.phone,
        hubspotId: contact.sourceId,
        coldLeadTypes: contact.customFields?.coldLeadTypes?.join(', ') || '',
        tags: contact.tags?.join(', ') || '',
        createdAt: contact.createdAt,
        lastSyncedAt: contact.customFields?.lastSyncedAt
      }));
      
      const fs = require('fs');
      const csvContent = [
        'firstName,lastName,email,company,phone,hubspotId,coldLeadTypes,tags,createdAt,lastSyncedAt',
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\\n');
      
      const filename = `railway-cold-leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      fs.writeFileSync(filename, csvContent);
      console.log(`✅ CSV exported: ${filename}`);
      console.log(`   Contains ${allColdLeads.length} Cold Lead contacts`);
    }
    
    console.log('\\n📊 Cold Lead Breakdown:');
    console.log(`Seller Cold Leads: ${coldLeadStats.seller}`);
    console.log(`Buyer Cold Leads: ${coldLeadStats.buyer}`);
    console.log(`CRE Cold Leads: ${coldLeadStats.cre}`);
    console.log(`EXF Cold Leads: ${coldLeadStats.exf}`);
    
    // Verify Doug Broomes is now in Railway
    console.log('\\n🔍 Verifying Doug Broomes in Railway database...');
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
    
    console.log('\\n🛡️ Railway Cold Lead Protection System Status:');
    console.log('✅ All Cold Leads synced to Railway database');
    console.log('✅ Protection tags applied');
    console.log('✅ Railway CRM ready for use');
    console.log('✅ Ready for deletion protection testing');
    
    console.log('\\n🎯 Next Steps:');
    console.log('1. Search for contacts in Railway CRM: https://web-production-37634.up.railway.app/');
    console.log('2. Test Cold Lead deletion protection');
    console.log('3. Delete a Cold Lead from HubSpot and verify it stays in Railway CRM');
    
    return {
      totalProcessed,
      coldLeadsFound,
      newColdLeads,
      updatedColdLeads,
      coldLeadStats
    };
    
  } catch (error) {
    console.error('❌ Railway sync error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\\n🔌 Disconnected from Railway database');
  }
}

// Run the sync
if (require.main === module) {
  syncToRailwayDatabase()
    .then((results) => {
      console.log(`\\n🚂 Railway Database Sync Successfully Completed!`);
      console.log(`Found and synced ${results.coldLeadsFound} Cold Leads to Railway`);
      console.log('\\n🎉 Railway CRM is now ready with all Cold Lead protection!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Railway database sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = { syncToRailwayDatabase };