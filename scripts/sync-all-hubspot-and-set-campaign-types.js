require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const hubspotService = require('../src/services/hubspotService');

async function syncAllAndSetCampaignTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('   SYNC ALL HUBSPOT CONTACTS & SET CAMPAIGN TYPES');
    console.log('═══════════════════════════════════════════════════════\n');

    // Step 1: Check current state
    const currentCount = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`📊 Current HubSpot contacts in database: ${currentCount.toLocaleString()}\n`);

    // Step 2: Sync all contacts from HubSpot
    console.log('🔄 Fetching all contacts from HubSpot...');
    console.log('This may take several minutes for 160k+ contacts...\n');
    
    let hubspotContacts = [];
    try {
      hubspotContacts = await hubspotService.getAllContacts();
      console.log(`✅ Fetched ${hubspotContacts.length.toLocaleString()} contacts from HubSpot\n`);
      
      // Save/update contacts in database
      console.log('💾 Saving contacts to database...');
      let saved = 0;
      let updated = 0;
      
      for (let i = 0; i < hubspotContacts.length; i++) {
        const hubspotContact = hubspotContacts[i];
        const contactData = hubspotService.transformContactData(hubspotContact);
        
        contactData.source = 'hubspot';
        contactData.sourceId = `hubspot_${hubspotContact.id}`;
        contactData.lastSyncedAt = new Date();
        
        try {
          const existing = await Contact.findOne({ email: contactData.email });
          if (existing) {
            await Contact.updateOne({ _id: existing._id }, contactData);
            updated++;
          } else {
            await Contact.create(contactData);
            saved++;
          }
        } catch (error) {
          // Skip duplicates or errors
        }
        
        if ((i + 1) % 1000 === 0) {
          console.log(`  Progress: ${(i + 1).toLocaleString()}/${hubspotContacts.length.toLocaleString()} (${saved} new, ${updated} updated)`);
        }
      }
      
      console.log(`✅ Saved ${saved.toLocaleString()} new contacts, updated ${updated.toLocaleString()} existing\n`);
    } catch (error) {
      console.log('⚠️  HubSpot fetch encountered issues:', error.message);
      console.log('Continuing with existing contacts in database...\n');
    }

    // Step 3: Get updated count
    const afterSyncCount = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`📊 HubSpot contacts after sync: ${afterSyncCount.toLocaleString()}\n`);

    // Step 4: Set campaign types based on DNC and Cold Lead fields
    console.log('🎯 Setting campaign types based on DNC and Cold Lead fields...\n');
    console.log('Logic:');
    console.log('  - Seller: dnc___seller_outreach OR seller_cold_lead');
    console.log('  - Buyer: dnc___buyer_outreach OR buyer_cold_lead');
    console.log('  - CRE: dnc___cre_outreach OR cre_cold_lead');
    console.log('  - Exit Factor: dnc___exf_outreach OR exf_cold_lead');
    console.log('  - Contacts can have MULTIPLE types\n');

    // Get all contacts
    const allContacts = await Contact.find({ source: 'hubspot' }).lean();
    console.log(`Processing ${allContacts.length.toLocaleString()} contacts...\n`);

    const updates = [];
    const stats = {
      seller: 0,
      buyer: 0,
      cre: 0,
      exitFactor: 0,
      multiple: 0,
      none: 0
    };

    for (const contact of allContacts) {
      const types = [];

      // Check Seller
      if (contact.dnc___seller_outreach === true || contact.seller_cold_lead === true) {
        types.push('Seller');
        stats.seller++;
      }

      // Check Buyer
      if (contact.dnc___buyer_outreach === true || contact.buyer_cold_lead === true) {
        types.push('Buyer');
        stats.buyer++;
      }

      // Check CRE
      if (contact.dnc___cre_outreach === true || contact.cre_cold_lead === true) {
        types.push('CRE');
        stats.cre++;
      }

      // Check Exit Factor
      if (contact.dnc___exf_outreach === true || contact.exf_cold_lead === true) {
        types.push('Exit Factor');
        stats.exitFactor++;
      }

      // For now, we'll set campaignType to the first type (or empty if none)
      // And store all types in customFields for reference
      const primaryType = types[0] || '';
      
      if (types.length > 1) {
        stats.multiple++;
      } else if (types.length === 0) {
        stats.none++;
      }

      // Only update if there's a change
      if (primaryType !== contact.campaignType || types.length > 0) {
        updates.push({
          updateOne: {
            filter: { _id: contact._id },
            update: {
              $set: {
                campaignType: primaryType,
                'customFields.campaignTypes': types, // Store all types
                'customFields.campaignTypeCount': types.length
              }
            }
          }
        });
      }

      // Progress indicator
      if (updates.length % 10000 === 0 && updates.length > 0) {
        console.log(`  Processed ${updates.length.toLocaleString()} contacts...`);
      }
    }

    console.log(`\n📝 Prepared ${updates.length.toLocaleString()} updates\n`);

    // Execute bulk update
    if (updates.length > 0) {
      console.log('💾 Updating database...');
      const result = await Contact.bulkWrite(updates, { ordered: false });
      console.log(`✅ Updated ${result.modifiedCount.toLocaleString()} contacts\n`);
    }

    // Show statistics
    console.log('═══════════════════════════════════════════════════════');
    console.log('   CAMPAIGN TYPE STATISTICS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`🛒 Buyer contacts: ${stats.buyer.toLocaleString()}`);
    console.log(`💼 Seller contacts: ${stats.seller.toLocaleString()}`);
    console.log(`🏢 CRE contacts: ${stats.cre.toLocaleString()}`);
    console.log(`🚀 Exit Factor contacts: ${stats.exitFactor.toLocaleString()}`);
    console.log(`\n🔀 Contacts with multiple types: ${stats.multiple.toLocaleString()}`);
    console.log(`⚪ Contacts with no type: ${stats.none.toLocaleString()}\n`);

    // Show final distribution
    const finalCounts = await Contact.aggregate([
      { $match: { source: 'hubspot' } },
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Primary Campaign Type Distribution:');
    finalCounts.forEach(item => {
      const label = item._id || '(not set)';
      console.log(`  ${label}: ${item.count.toLocaleString()}`);
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✨ Sync and campaign type assignment complete!');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

syncAllAndSetCampaignTypes();
