const axios = require('axios');
const logger = require('../utils/logger');

class HubSpotService {
  constructor() {
    this.baseURL = 'https://api.hubapi.com';
    this.accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    
    if (!this.accessToken) {
      logger.warn('HubSpot access token not configured');
    }
  }

  async getContacts(limit = 100, after = null, contactId = null) {
    try {
      const params = {
        properties: [
          // Basic contact info
          'firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle',
          'address', 'city', 'state', 'zip', 'country', 'lifecyclestage',
          'createdate', 'lastmodifieddate',
          
          // Business and industry fields
          'business_category___industry_of_interest', 'annualrevenue', 'industry',
          'account_type', 'contact_type', 'broker', 'lead_source',
          'buyer_status', 'seller_status', 'interested_in',
          'website', 'linkedin_profile', 'year_established',
          'currently_own_a_business', 'legal_organization_type',
          'primary_investor_type', 'buying_role', 'motivation_for_buying',
          
          // DNC and compliance
          'do_not_call', 'dnc_flag', 'optout'
        ].join(',')
      };

      let url = `${this.baseURL}/crm/v3/objects/contacts`;
      
      if (contactId) {
        // Get specific contact
        url += `/${contactId}`;
      } else {
        // Get multiple contacts
        params.limit = limit;
        if (after) {
          params.after = after;
        }
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: contactId ? { properties: params.properties } : params
      });

      return contactId ? { results: [response.data] } : response.data;
    } catch (error) {
      logger.error('Error fetching HubSpot contacts:', error.response?.data || error.message);
      throw error;
    }
  }

  async getAllContacts() {
    const allContacts = [];
    let after = null;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.getContacts(100, after);
        
        if (response.results) {
          allContacts.push(...response.results);
        }

        if (response.paging && response.paging.next) {
          after = response.paging.next.after;
        } else {
          hasMore = false;
        }

        logger.info(`Fetched ${allContacts.length} contacts from HubSpot`);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        logger.error('Error in getAllContacts:', error);
        throw error;
      }
    }

    return allContacts;
  }

  async getContactLists() {
    try {
      const lists = [];
      
      // Get static lists
      try {
        const listsResponse = await axios.get(`https://api.hubapi.com/contacts/v1/lists`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (listsResponse.data.lists) {
          lists.push(...listsResponse.data.lists.map(list => ({
            ...list,
            type: 'list'
          })));
        }
      } catch (error) {
        logger.error('Error fetching static lists:', error.message);
      }

      // Get object lists/saved filters (this is where your DNC list 6029 likely is)
      try {
        const objectListsResponse = await axios.get(`${this.baseURL}/crm/v3/objects/contact_lists`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (objectListsResponse.data.results) {
          lists.push(...objectListsResponse.data.results.map(objectList => ({
            listId: objectList.id,
            name: objectList.properties.name || `Object List ${objectList.id}`,
            listType: 'OBJECT_LIST',
            type: 'object_list',
            size: objectList.properties.size || 0,
            processingType: objectList.properties.processingType || 'Unknown'
          })));
        }
      } catch (error) {
        logger.error('Error fetching object lists:', error.message);
      }

      // Try the specific object lists endpoint that matches your URL
      try {
        const savedFiltersResponse = await axios.get(`https://api.hubapi.com/crm/v3/objects/contact_lists`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            limit: 100,
            properties: 'name,size,processingType,listType'
          }
        });
        
        if (savedFiltersResponse.data.results) {
          const savedFilters = savedFiltersResponse.data.results.filter(filter => 
            !lists.some(existingList => existingList.listId === filter.id)
          );
          
          lists.push(...savedFilters.map(filter => ({
            listId: filter.id,
            name: filter.properties.name || `Saved Filter ${filter.id}`,
            listType: 'SAVED_FILTER',
            type: 'saved_filter',
            size: filter.properties.size || 0
          })));
        }
      } catch (error) {
        logger.error('Error fetching saved filters:', error.message);
      }

      // Try another segments endpoint
      try {
        const altSegmentsResponse = await axios.get(`https://api.hubapi.com/contacts/v1/lists/dynamic`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (altSegmentsResponse.data.lists) {
          const dynamicLists = altSegmentsResponse.data.lists.filter(list => 
            !lists.some(existingList => existingList.listId === list.listId)
          );
          
          lists.push(...dynamicLists.map(list => ({
            ...list,
            type: 'dynamic_list'
          })));
        }
      } catch (error) {
        logger.error('Error fetching dynamic lists:', error.message);
      }

      logger.info(`Found ${lists.length} total lists/segments`);
      return lists;
      
    } catch (error) {
      logger.error('Error in getContactLists:', error);
      throw error;
    }
  }

  async getContactsFromList(listId, limit = 100, after = null) {
    try {
      const params = {
        count: limit,
        property: [
          // Basic contact info
          'firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle',
          'address', 'city', 'state', 'zip', 'country', 'lifecyclestage',
          'createdate', 'lastmodifieddate',
          
          // Business and industry fields  
          'business_category___industry_of_interest', 'annualrevenue', 'industry',
          'account_type', 'contact_type', 'broker', 'lead_source',
          'buyer_status', 'seller_status', 'interested_in',
          'website', 'linkedin_profile', 'year_established',
          
          // DNC and compliance
          'do_not_call', 'dnc_flag', 'optout'
        ]
      };

      if (after) {
        params.vidOffset = after;
      }

      // Use legacy contacts API for list memberships
      const response = await axios.get(`https://api.hubapi.com/contacts/v1/lists/${listId}/contacts/all`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params
      });

      return {
        results: response.data.contacts || [],
        paging: response.data['has-more'] ? { 
          next: { after: response.data['vid-offset'] } 
        } : null
      };
    } catch (error) {
      logger.error('Error fetching contacts from HubSpot list:', error.response?.data || error.message);
      
      // Fallback to newer API
      try {
        const params = {
          limit,
          properties: [
            'firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle',
            'address', 'city', 'state', 'zip', 'country', 'lifecyclestage',
            'createdate', 'lastmodifieddate'
          ].join(',')
        };

        if (after) {
          params.after = after;
        }

        const fallbackResponse = await axios.get(`${this.baseURL}/crm/v3/lists/${listId}/memberships`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          params
        });

        return fallbackResponse.data;
      } catch (fallbackError) {
        logger.error('Error with fallback list contacts API:', fallbackError.response?.data || fallbackError.message);
        throw fallbackError;
      }
    }
  }

  async getAllContactsFromList(listId) {
    const allContacts = [];
    let after = null;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.getContactsFromList(listId, 100, after);
        
        if (response.results) {
          allContacts.push(...response.results);
        }

        if (response.paging && response.paging.next) {
          after = response.paging.next.after;
        } else {
          hasMore = false;
        }

        logger.info(`Fetched ${allContacts.length} contacts from HubSpot list ${listId}`);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        logger.error('Error in getAllContactsFromList:', error);
        throw error;
      }
    }

    return allContacts;
  }

  async getContactsSince(timestamp) {
    try {
      const response = await axios.get(`${this.baseURL}/crm/v3/objects/contacts`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 100,
          properties: [
            // Basic contact info
            'firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle',
            'address', 'city', 'state', 'zip', 'country', 'lifecyclestage',
            'createdate', 'lastmodifieddate',
            
            // Business and industry fields
            'business_category___industry_of_interest', 'annualrevenue', 'industry',
            'account_type', 'contact_type', 'broker', 'lead_source',
            'buyer_status', 'seller_status', 'interested_in',
            'website', 'linkedin_profile', 'year_established',
            
            // DNC and compliance
            'do_not_call', 'dnc_flag', 'optout'
          ].join(','),
          filters: JSON.stringify([{
            propertyName: 'lastmodifieddate',
            operator: 'GTE',
            value: timestamp
          }])
        }
      });

      return response.data.results || [];
    } catch (error) {
      logger.error('Error fetching recent HubSpot contacts:', error.response?.data || error.message);
      throw error;
    }
  }

  transformContactData(hubspotContact) {
    const props = hubspotContact.properties;
    
    // Extract DNC information from HubSpot properties
    const dncStatus = this.mapDncStatus(props);
    
    return {
      firstName: props.firstname?.trim() || '',
      lastName: props.lastname?.trim() || '',
      email: props.email?.trim()?.toLowerCase() || '',
      phone: props.phone?.trim() || '',
      company: props.company?.trim() || '',
      jobTitle: props.jobtitle?.trim() || '',
      address: {
        street: props.address || '',
        city: props.city || '',
        state: props.state || '',
        zipCode: props.zip || '',
        country: props.country || ''
      },
      source: 'hubspot',
      sourceId: hubspotContact.id,
      lifecycleStage: this.mapLifecycleStage(props.lifecyclestage),
      dncStatus: dncStatus.status,
      dncDate: dncStatus.date,
      dncReason: dncStatus.reason,
      complianceNotes: props.compliance_notes || '',
      customFields: {
        hubspotId: hubspotContact.id,
        createDate: props.createdate,
        lastModifiedDate: props.lastmodifieddate,
        
        // Business fields
        businessCategory: props.business_category___industry_of_interest || '',
        industry: props.industry || '',
        annualRevenue: props.annualrevenue || '',
        accountType: props.account_type || '',
        contactType: props.contact_type || '',
        broker: props.broker || '',
        leadSource: props.lead_source || '',
        buyerStatus: props.buyer_status || '',
        sellerStatus: props.seller_status || '',
        interestedIn: props.interested_in || '',
        website: props.website || '',
        linkedinProfile: props.linkedin_profile || '',
        yearEstablished: props.year_established || '',
        currentlyOwnBusiness: props.currently_own_a_business || '',
        legalOrgType: props.legal_organization_type || '',
        primaryInvestorType: props.primary_investor_type || '',
        buyingRole: props.buying_role || '',
        motivationForBuying: props.motivation_for_buying || '',
        
        // DNC fields
        hubspotDncFlag: props.dnc_flag || '',
        hubspotDoNotCall: props.do_not_call || '',
        hubspotMarketingOptOut: props.optout || ''
      },
      lastSyncedAt: new Date()
    };
  }

  mapDncStatus(props) {
    // Handle missing properties object
    if (!props) {
      return {
        status: 'callable',
        date: null,
        reason: null
      };
    }
    
    // Map HubSpot DNC properties to our DNC status
    if (props.do_not_call === 'true' || props.dnc_flag === 'true') {
      return {
        status: 'dnc_internal',
        date: props.dnc_date ? new Date(props.dnc_date) : new Date(),
        reason: props.dnc_reason || 'Marked as DNC in HubSpot'
      };
    }
    
    if (props.optout === 'true') {
      return {
        status: 'dnc_internal',
        date: props.optout_date ? new Date(props.optout_date) : new Date(),
        reason: 'Marketing opt-out'
      };
    }

    // Check for specific DNC list membership
    if (props.federal_dnc === 'true') {
      return {
        status: 'dnc_federal',
        date: props.federal_dnc_date ? new Date(props.federal_dnc_date) : null,
        reason: 'Federal DNC Registry'
      };
    }

    if (props.state_dnc === 'true') {
      return {
        status: 'dnc_state',
        date: props.state_dnc_date ? new Date(props.state_dnc_date) : null,
        reason: 'State DNC Registry'
      };
    }

    if (props.wireless_dnc === 'true') {
      return {
        status: 'dnc_wireless',
        date: props.wireless_dnc_date ? new Date(props.wireless_dnc_date) : null,
        reason: 'Wireless DNC Registry'
      };
    }

    return {
      status: 'callable',
      date: null,
      reason: null
    };
  }

  mapLifecycleStage(hubspotStage) {
    const stageMap = {
      'subscriber': 'lead',
      'lead': 'lead', 
      'marketingqualifiedlead': 'prospect',
      'salesqualifiedlead': 'prospect',
      'opportunity': 'prospect',
      'customer': 'customer',
      'evangelist': 'evangelist'
    };
    
    return stageMap[hubspotStage] || 'lead';
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/crm/v3/objects/contacts`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: { limit: 1 }
      });
      
      logger.info('HubSpot connection test successful');
      return true;
    } catch (error) {
      logger.error('HubSpot connection test failed:', error.response?.data || error.message);
      return false;
    }
  }
}

module.exports = new HubSpotService();