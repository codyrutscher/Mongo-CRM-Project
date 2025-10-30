require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

const apiId = process.env.RESPONSE_GENIUS_API_ID;
const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
const baseUrl = process.env.RESPONSE_GENIUS_API_URL || 'https://control.responsegenius.com/rest';

const lists = {
  dnc_seller: { listId: process.env.RESPONSE_GENIUS_DNC_SELLER_LIST_ID, property: 'dnc___seller_outreach', name: 'DNC Seller' },
  dnc_buyer: { listId: process.env.RESPONSE_GENIUS_DNC_BUYER_LIST_ID, property: 'dnc___buyer_outreach', name: 'DNC Buyer' },
  dnc_cre: { listId: process.env.RESPONSE_GENIUS_DNC_CRE_LIST_ID, property: 'dnc___cre_outreach', name: 'DNC CRE' },
  dnc_exf: { listId: process.env.RESPONSE_GENIUS_DNC_EXF_LIST_ID, property: 'dnc___exf_outreach', name: 'DNC EXF' },
  cold_seller: { listId: process.env.RESPONSE_GENIUS_COLD_SELLER_LIST_ID, property: 'seller_cold_lead', name: 'Cold Seller' },
  cold_buyer: { listId: process.env.RESPONSE_GENIUS_COLD_BUYER_LIST_ID, property: 'buyer_cold_lead', name: 'Cold Buyer' },
  cold_cre: { listId: process.env.RESPONSE_GENIUS_COLD_CRE_LIST_ID, property: 'cre_cold_lead', name: 'Cold CRE' },
  cold_exf: { listId: process.env.RESPONSE_GENIUS_COLD_EXF_LIST_ID, property: 'exf_cold_lead', name: 'Cold EXF' }
};

async function addContactToList(contact, listId, listName) {
  try {
    // Try to subscribe user - if they don't exist, this will create them
    await axios.get(`${baseUrl}/lists/subscribe_user`, {
      params: {
        api_id: apiId,
        api_key: apiKey,
        list_api_identifier: listId,
        email_address: contact.email,
        first_name: contact.firstName || '',
        last_name: contact.lastName || '',
        phone: contact.phone || '',
        list_preference: 'optin'
      }
    });
    return { success: true };
  } catch (error) {
    // If 404, user doesn't exist - we need to create them first
    if (error.response?.status === 404) {
      // Response Genius might require creating user in a different way
      // Let's try with additional parameters
      try {
        await axios.get(`${baseUrl}/lists/subscribe_user`, {
          params: {
            api_id: apiId,
            api_key: apiKey,
            list_api_identifier: listId,
            email_address: contact.email,
            first_name: contact.firstName || '',
            last_name: contact.lastName || '',
            phone: contact.phone || '',
            list_preference: 'optin',
            force_subscribe: 'Y'
          }
        });
        return { success: true };
      } catch (retryError) {
        return { success: false, error: retryError.response?.data || retryError.message };
      }
    }
    return { success: false, error: error.response?.data || error.message };
  }
}

async function syncNewContacts() {
  try {
    console.log('🔄 Syncing New Contacts to Response Genius\n');
    
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Find contacts created or updated since 10/28
    const cutoffDate = new Date('2025-10-28');
    
    for (const [key, config] of Object.entries(lists)) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 ${config.name} (${config.listId})`);
      console.log('='.repeat(60));
      
      // Find contacts with this property that were updated since cutoff
      const contacts = await Contact.find({
        [config.property]: true,
        email: { $exists: true, $ne: null, $ne: '' },
        $or: [
          { createdAt: { $gte: cutoffDate } },
          { updatedAt: { $gte: cutoffDate } }
        ]
      }).select('email firstName lastName phone createdAt updatedAt').limit(100); // Limit for testing
      
      console.log(`Found ${contacts.length} contacts to sync`);
      
      if (contacts.length === 0) continue;
      
      let successCount = 0;
      let failCount = 0;
      
      for (const contact of contacts) {
        const result = await addContactToList(contact, config.listId, config.name);
        
        if (result.success) {
          successCount++;
          console.log(`  ✅ ${contact.email}`);
        } else {
          failCount++;
          console.log(`  ❌ ${contact.email}: ${JSON.stringify(result.error)}`);
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`\nResults: ${successCount} success, ${failCount} failed`);
    }
    
    console.log('\n✅ Sync complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

syncNewContacts();
