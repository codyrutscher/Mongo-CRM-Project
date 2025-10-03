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
        properties: 'firstname,lastname,jobtitle,linkedin_profile_url,email,phone,website,business_category___industry_of_interest,naics_code,numemployees,year_established,office_phone,address,city,state,zip,lead_source,contact_type,hs_email_last_send_date,createdate,lastmodifieddate,lifecyclestage,annualrevenue,industry,account_type,broker,buyer_status,seller_status,currently_own_a_business,legal_organization_type,primary_investor_type,buying_role,motivation_for_buying,dnc_flag,optout,compliance_notes,hs_do_not_call,do_not_call'
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
    const mappingService = require('./fieldMappingService');
    
    // Use the field mapping service to transform to NAICS standard
    const contact = mappingService.mapHubSpotToContact(hubspotContact);
    
    // Handle missing company field (causes 500 error in API)
    const props = hubspotContact.properties;
    contact.company = props.company || ''; // Will be empty since we can't fetch it
    
    // Add HubSpot-specific DNC and compliance handling
    const dncStatus = this.mapDncStatus(props);
    
    contact.dncStatus = dncStatus.status;
    contact.dncDate = dncStatus.date;
    contact.dncReason = dncStatus.reason;
    contact.complianceNotes = props.compliance_notes || '';
    
    // Add HubSpot-specific metadata to customFields
    contact.customFields = contact.customFields || {};
    contact.customFields.hubspotId = hubspotContact.id;
    contact.customFields.createDate = props.createdate;
    contact.customFields.lastModifiedDate = props.lastmodifieddate;
    contact.customFields.lifecycleStage = props.lifecyclestage;
    
    // Additional HubSpot fields not in NAICS standard
    contact.customFields.annualRevenue = props.annualrevenue || '';
    contact.customFields.accountType = props.account_type || '';
    contact.customFields.broker = props.broker || '';
    contact.customFields.buyerStatus = props.buyer_status || '';
    contact.customFields.sellerStatus = props.seller_status || '';
    contact.customFields.interestedIn = props.interested_in || '';
    contact.customFields.currentlyOwnBusiness = props.currently_own_a_business || '';
    contact.customFields.legalOrgType = props.legal_organization_type || '';
    contact.customFields.primaryInvestorType = props.primary_investor_type || '';
    contact.customFields.buyingRole = props.buying_role || '';
    contact.customFields.motivationForBuying = props.motivation_for_buying || '';
    
    // DNC flags from HubSpot (using working properties)
    contact.customFields.hubspotDncFlag = props.dnc_flag || '';
    contact.customFields.hubspotDoNotCall = props.hs_do_not_call || props.do_not_call || props.dnc_flag || props.hs_email_optout || 'false';
    contact.customFields.hubspotMarketingOptOut = props.optout || props.hs_email_optout || '';
    contact.customFields.hubspotMarketableStatus = props.hs_marketable_status || '';
    
    contact.lastSyncedAt = new Date();
    
    return contact;
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
    // Check for DNC using multiple HubSpot properties
    if (props.hs_do_not_call === 'true' || props.hs_do_not_call === true ||
        props.do_not_call === 'true' || props.do_not_call === true ||
        props.dnc_flag === 'true' || props.dnc_flag === true ||
        props.hs_email_optout === 'true' || props.hs_email_optout === true ||
        props.hs_marketable_status === 'NOT_OPTED_IN') {
      return {
        status: 'dnc_internal',
        date: props.dnc_date ? new Date(props.dnc_date) : new Date(),
        reason: props.dnc_reason || 'Marked as DNC in HubSpot (Do Not Call property)'
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