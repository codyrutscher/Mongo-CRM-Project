const axios = require('axios');
const mongoose = require('mongoose');

class ResponseGeniusDncService {
  constructor() {
    this.apiId = process.env.RESPONSE_GENIUS_API_ID;
    this.apiKey = process.env.RESPONSE_GENIUS_API_KEY;
    this.baseUrl = process.env.RESPONSE_GENIUS_API_URL;
    
    // Map list types to their IDs and corresponding properties
    this.listConfig = {
      seller: {
        listId: process.env.RESPONSE_GENIUS_SELLER_LIST_ID,
        dncProperty: 'dnc___seller_outreach',
        coldLeadProperty: 'seller_cold_lead'
      },
      buyer: {
        listId: process.env.RESPONSE_GENIUS_BUYER_LIST_ID,
        dncProperty: 'dnc___buyer_outreach',
        coldLeadProperty: 'buyer_cold_lead'
      },
      cre: {
        listId: process.env.RESPONSE_GENIUS_CRE_LIST_ID,
        dncProperty: 'dnc___cre_outreach',
        coldLeadProperty: 'cre_cold_lead'
      },
      exf: {
        listId: process.env.RESPONSE_GENIUS_EXF_LIST_ID,
        dncProperty: 'dnc___exf_outreach',
        coldLeadProperty: 'exf_cold_lead'
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

  async addContactToList(listId, email, firstName = '', lastName = '', phone = '') {
    return this.makeRequest('/lists/import_optin', 'POST', {
      list_api_identifier: listId,
      contacts: [{
        email,
        first_name: firstName,
        last_name: lastName,
        phone
      }]
    });
  }

  async removeContactFromList(listId, email) {
    return this.makeRequest('/lists/import_optout', 'POST', {
      list_api_identifier: listId,
      contacts: [{ email }]
    });
  }

  async getContactsForList(listType) {
    const Contact = mongoose.model('Contact');
    const config = this.listConfig[listType];
    
    if (!config) {
      throw new Error(`Invalid list type: ${listType}`);
    }

    // Map to customFields properties
    const coldLeadFieldMap = {
      seller_cold_lead: 'customFields.sellerColdLead',
      buyer_cold_lead: 'customFields.buyerColdLead',
      cre_cold_lead: 'customFields.creColdLead',
      exf_cold_lead: 'customFields.exfColdLead'
    };

    const coldLeadField = coldLeadFieldMap[config.coldLeadProperty];

    // Find contacts where either DNC property is true OR cold lead property is true
    const query = {
      $or: [
        { [config.dncProperty]: true },
        { [coldLeadField]: true }
      ],
      email: { $exists: true, $ne: null, $ne: '' }
    };

    return Contact.find(query).select('email firstname lastname phone').lean();
  }

  async syncListToResponseGenius(listType) {
    console.log(`\nSyncing ${listType} list to Response Genius...`);
    const config = this.listConfig[listType];
    const contacts = await this.getContactsForList(listType);
    
    console.log(`Found ${contacts.length} contacts for ${listType} list`);
    
    if (contacts.length === 0) {
      return { success: true, added: 0 };
    }

    // Batch contacts in groups of 100
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
        console.log(`  Added batch ${Math.floor(i / batchSize) + 1}: ${batch.length} contacts`);
      } catch (error) {
        console.error(`  Error adding batch: ${error.message}`);
      }
    }

    return { success: true, added: totalAdded };
  }

  async syncAllLists() {
    const results = {};
    
    for (const listType of Object.keys(this.listConfig)) {
      try {
        results[listType] = await this.syncListToResponseGenius(listType);
      } catch (error) {
        console.error(`Error syncing ${listType} list:`, error.message);
        results[listType] = { success: false, error: error.message };
      }
    }
    
    return results;
  }

  async handleContactUpdate(contact, changedProperties) {
    // Check which lists this contact should be on
    const updates = [];
    
    for (const [listType, config] of Object.entries(this.listConfig)) {
      const shouldBeOnList = contact[config.dncProperty] === true || 
                            contact[config.coldLeadProperty] === true;
      
      // If the changed properties include this list's properties
      if (changedProperties.includes(config.dncProperty) || 
          changedProperties.includes(config.coldLeadProperty)) {
        
        if (shouldBeOnList) {
          updates.push(this.addContactToList(
            config.listId,
            contact.email,
            contact.firstname,
            contact.lastname,
            contact.phone
          ));
        } else {
          updates.push(this.removeContactFromList(config.listId, contact.email));
        }
      }
    }
    
    return Promise.all(updates);
  }
}

module.exports = new ResponseGeniusDncService();
