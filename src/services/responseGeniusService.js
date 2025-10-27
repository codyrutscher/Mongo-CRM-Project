const axios = require('axios');

/**
 * Response Genius Service
 * Manages DNC (Do Not Call) list synchronization with Response Genius
 * Syncs Cold Lead contacts to appropriate suppression lists
 */

class ResponseGeniusService {
  constructor() {
    this.apiId = process.env.RESPONSE_GENIUS_API_ID;
    this.apiKey = process.env.RESPONSE_GENIUS_API_KEY;
    this.apiUrl = process.env.RESPONSE_GENIUS_API_URL || 'https://control.responsegenius.com';
    
    // List IDs for each Cold Lead type
    this.lists = {
      seller: process.env.RESPONSE_GENIUS_SELLER_LIST_ID || 'dnc___seller_outreach',
      buyer: process.env.RESPONSE_GENIUS_BUYER_LIST_ID || 'dnc___buyer_outreach',
      cre: process.env.RESPONSE_GENIUS_CRE_LIST_ID || 'dnc___cre_outreach',
      exf: process.env.RESPONSE_GENIUS_EXF_LIST_ID || 'dnc___exf_outreach'
    };

    if (!this.apiId || this.apiId === 'your_api_id_here' || 
        !this.apiKey || this.apiKey === 'your_api_key_here') {
      console.warn('⚠️  Response Genius API credentials not configured');
    }
  }
  
  /**
   * Check if API is configured
   */
  isConfigured() {
    return this.apiId && this.apiId !== 'your_api_id_here' &&
           this.apiKey && this.apiKey !== 'your_api_key_here';
  }

  /**
   * Add a contact to a Response Genius suppression list
   */
  async addToList(listId, contact) {
    if (!this.isConfigured()) {
      console.log(`[DRY RUN] Would add ${contact.email} to list ${listId}`);
      return { success: true, dryRun: true };
    }

    try {
      // Response Genius API uses query parameters for authentication
      const response = await axios.post(
        `${this.apiUrl}/api/v1/suppression/add`,
        {
          list_name: listId,
          email: contact.email,
          phone: contact.phone || '',
          first_name: contact.firstName || '',
          last_name: contact.lastName || '',
          custom_data: {
            hubspot_id: contact.sourceId,
            cold_lead_type: contact.coldLeadType,
            added_at: new Date().toISOString()
          }
        },
        {
          params: {
            api_id: this.apiId,
            api_key: this.apiKey
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error adding contact to Response Genius list ${listId}:`, error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove a contact from a Response Genius suppression list
   */
  async removeFromList(listId, email) {
    if (!this.isConfigured()) {
      console.log(`[DRY RUN] Would remove ${email} from list ${listId}`);
      return { success: true, dryRun: true };
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/api/v1/suppression/remove`,
        {
          list_name: listId,
          email: email
        },
        {
          params: {
            api_id: this.apiId,
            api_key: this.apiKey
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error removing contact from Response Genius list ${listId}:`, error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync a Cold Lead contact to appropriate Response Genius lists
   * Based on their Cold Lead type properties
   */
  async syncColdLead(contact) {
    const results = {
      seller: null,
      buyer: null,
      cre: null,
      exf: null
    };

    // Check if contact has email
    if (!contact.email) {
      console.warn(`Contact ${contact.sourceId} has no email, skipping Response Genius sync`);
      return { success: false, error: 'No email address' };
    }

    // Get Cold Lead properties from customFields
    const customFields = contact.customFields || {};
    const isSeller = customFields.sellerColdLead === true;
    const isBuyer = customFields.buyerColdLead === true;
    const isCre = customFields.creColdLead === true;
    const isExf = customFields.exfColdLead === true;

    // Sync to appropriate lists
    if (isSeller) {
      results.seller = await this.addToList(this.lists.seller, {
        ...contact,
        coldLeadType: 'Seller'
      });
    }

    if (isBuyer) {
      results.buyer = await this.addToList(this.lists.buyer, {
        ...contact,
        coldLeadType: 'Buyer'
      });
    }

    if (isCre) {
      results.cre = await this.addToList(this.lists.cre, {
        ...contact,
        coldLeadType: 'CRE'
      });
    }

    if (isExf) {
      results.exf = await this.addToList(this.lists.exf, {
        ...contact,
        coldLeadType: 'EXF'
      });
    }

    return {
      success: true,
      results,
      syncedTo: Object.keys(results).filter(key => results[key]?.success)
    };
  }

  /**
   * Remove a contact from all Response Genius lists
   */
  async removeFromAllLists(email) {
    const results = {
      seller: await this.removeFromList(this.lists.seller, email),
      buyer: await this.removeFromList(this.lists.buyer, email),
      cre: await this.removeFromList(this.lists.cre, email),
      exf: await this.removeFromList(this.lists.exf, email)
    };

    return {
      success: true,
      results,
      removedFrom: Object.keys(results).filter(key => results[key]?.success)
    };
  }

  /**
   * Bulk sync multiple Cold Lead contacts
   */
  async bulkSyncColdLeads(contacts) {
    console.log(`Syncing ${contacts.length} Cold Leads to Response Genius...`);
    
    const results = {
      synced: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const contact of contacts) {
      try {
        const result = await this.syncColdLead(contact);
        
        if (result.success) {
          results.synced++;
        } else {
          results.skipped++;
        }

        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.failed++;
        results.errors.push({
          contactId: contact.sourceId,
          email: contact.email,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = new ResponseGeniusService();
