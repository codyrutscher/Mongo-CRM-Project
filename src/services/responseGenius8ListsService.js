const axios = require('axios');
const mongoose = require('mongoose');

class ResponseGenius8ListsService {
  constructor() {
    this.apiId = process.env.RESPONSE_GENIUS_API_ID;
    this.apiKey = process.env.RESPONSE_GENIUS_API_KEY;
    this.baseUrl = process.env.RESPONSE_GENIUS_API_URL;
    
    // 8 separate lists configuration
    this.lists = {
      // DNC Lists (4)
      dnc_seller: {
        listId: process.env.RESPONSE_GENIUS_DNC_SELLER_LIST_ID,
        name: 'DNC - Seller outreach',
        hubspotProperty: 'dnc___seller_outreach',
        prospereProperty: 'dnc___seller_outreach',
        type: 'dnc'
      },
      dnc_buyer: {
        listId: process.env.RESPONSE_GENIUS_DNC_BUYER_LIST_ID,
        name: 'DNC - Buyer outreach',
        hubspotProperty: 'dnc___buyer_outreach',
        prospereProperty: 'dnc___buyer_outreach',
        type: 'dnc'
      },
      dnc_cre: {
        listId: process.env.RESPONSE_GENIUS_DNC_CRE_LIST_ID,
        name: 'DNC - CRE outreach',
        hubspotProperty: 'dnc___cre_outreach',
        prospereProperty: 'dnc___cre_outreach',
        type: 'dnc'
      },
      dnc_exf: {
        listId: process.env.RESPONSE_GENIUS_DNC_EXF_LIST_ID,
        name: 'DNC - EXF outreach',
        hubspotProperty: 'dnc___exf_outreach',
        prospereProperty: 'dnc___exf_outreach',
        type: 'dnc'
      },
      // Cold Lead Lists (4)
      cold_seller: {
        listId: process.env.RESPONSE_GENIUS_COLD_SELLER_LIST_ID,
        name: 'Seller Cold Lead',
        hubspotProperty: 'seller_cold_lead',
        prospereProperty: 'seller_cold_lead',
        type: 'cold_lead'
      },
      cold_buyer: {
        listId: process.env.RESPONSE_GENIUS_COLD_BUYER_LIST_ID,
        name: 'Buyer Cold Lead',
        hubspotProperty: 'buyer_cold_lead',
        prospereProperty: 'buyer_cold_lead',
        type: 'cold_lead'
      },
      cold_cre: {
        listId: process.env.RESPONSE_GENIUS_COLD_CRE_LIST_ID,
        name: 'CRE Cold Lead',
        hubspotProperty: 'cre_cold_lead',
        prospereProperty: 'cre_cold_lead',
        type: 'cold_lead'
      },
      cold_exf: {
        listId: process.env.RESPONSE_GENIUS_COLD_EXF_LIST_ID,
        name: 'EXF Cold Lead',
        hubspotProperty: 'exf_cold_lead',
        prospereProperty: 'exf_cold_lead',
        type: 'cold_lead'
      }
    };
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      method,
      url,
      params: { api_id: this.apiId, api_key: this.apiKey },
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) {
      if (method === 'GET') {
        config.params = { ...config.params, ...data };
      } else {
        config.data = data;
      }
    }
    
    const response = await axios(config);
    return response.data;
  }

  async getContactsForList(listKey) {
    const Contact = mongoose.model('Contact');
    const config = this.lists[listKey];
    
    if (!config) {
      throw new Error(`Invalid list key: ${listKey}`);
    }

    // Build query based on property path
    const query = {
      [config.prospereProperty]: true,
      email: { $exists: true, $ne: null, $ne: '' }
    };

    return Contact.find(query).select('email firstname lastname phone').lean();
  }

  async syncListToResponseGenius(listKey) {
    console.log(`\nSyncing ${listKey} to Response Genius...`);
    const config = this.lists[listKey];
    const contacts = await this.getContactsForList(listKey);
    
    console.log(`  ${config.name}: ${contacts.length} contacts`);
    
    if (contacts.length === 0) {
      return { success: true, added: 0, listName: config.name };
    }

    const batchSize = 100;
    let totalAdded = 0;
    
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const formattedContacts = batch.map(c => ({
        email: c.email,
        first_name: c.firstname || '',
        last_name: c.lastname || '',
        phone: c.phone || ''
      }));

      try {
        await this.makeRequest('/lists/import_optin', 'POST', {
          list_api_identifier: config.listId,
          contacts: formattedContacts
        });
        totalAdded += batch.length;
        console.log(`    Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} contacts`);
      } catch (error) {
        console.error(`    Error: ${error.message}`);
      }
    }

    return { success: true, added: totalAdded, listName: config.name };
  }

  async syncAllLists() {
    const results = {};
    
    for (const listKey of Object.keys(this.lists)) {
      try {
        results[listKey] = await this.syncListToResponseGenius(listKey);
      } catch (error) {
        console.error(`Error syncing ${listKey}:`, error.message);
        results[listKey] = { success: false, error: error.message, listName: this.lists[listKey].name };
      }
    }
    
    return results;
  }

  async getListCounts() {
    const Contact = mongoose.model('Contact');
    const counts = {};
    
    for (const [listKey, config] of Object.entries(this.lists)) {
      const count = await Contact.countDocuments({
        [config.prospereProperty]: true,
        email: { $exists: true, $ne: null, $ne: '' }
      });
      counts[listKey] = {
        name: config.name,
        count,
        property: config.prospereProperty
      };
    }
    
    return counts;
  }

  async handleContactPropertyChange(contact, propertyName) {
    // Find which list this property belongs to
    const listEntry = Object.entries(this.lists).find(([key, config]) => 
      config.hubspotProperty === propertyName
    );
    
    if (!listEntry) {
      console.log(`Property ${propertyName} not found in list configuration`);
      return { success: false, error: 'Property not found' };
    }
    
    const [listKey, config] = listEntry;
    const isOnList = contact[config.prospereProperty] === true;
    
    console.log(`Syncing ${contact.email} to ${config.name}: ${isOnList ? 'ADD' : 'REMOVE'}`);
    
    try {
      if (isOnList) {
        // Add to list using subscribe_user endpoint
        const response = await axios.get(`${this.baseUrl}/lists/subscribe_user`, {
          params: {
            api_id: this.apiId,
            api_key: this.apiKey,
            list_api_identifier: config.listId,
            email_address: contact.email,
            first_name: contact.firstname || '',
            last_name: contact.lastname || '',
            phone: contact.phone || ''
          }
        });
        console.log(`✓ Added ${contact.email} to ${config.name}`);
      } else {
        // Remove from list using subscribe_user with optout
        const response = await axios.get(`${this.baseUrl}/lists/subscribe_user`, {
          params: {
            api_id: this.apiId,
            api_key: this.apiKey,
            list_api_identifier: config.listId,
            email_address: contact.email,
            list_preference: 'optout'
          }
        });
        console.log(`✓ Removed ${contact.email} from ${config.name}`);
      }
      
      return { success: true, listName: config.name, action: isOnList ? 'added' : 'removed' };
    } catch (error) {
      console.error(`Error syncing to Response Genius: ${error.message}`);
      if (error.response) {
        console.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ResponseGenius8ListsService();
