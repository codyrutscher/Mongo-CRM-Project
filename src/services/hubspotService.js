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
          'firstname',
          'lastname', 
          'email',
          'phone',
          'company',
          'jobtitle',
          'address',
          'city',
          'state',
          'zip',
          'country',
          'lifecyclestage',
          'createdate',
          'lastmodifieddate'
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

      // Get segments (smart lists) - this is where your DNC list likely is
      try {
        const segmentsResponse = await axios.get(`${this.baseURL}/crm/v3/objects/contact_lists`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (segmentsResponse.data.results) {
          lists.push(...segmentsResponse.data.results.map(segment => ({
            listId: segment.id,
            name: segment.properties.name,
            listType: 'SEGMENT',
            type: 'segment',
            size: segment.properties.size || 0
          })));
        }
      } catch (error) {
        logger.error('Error fetching segments:', error.message);
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
          'firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle',
          'address', 'city', 'state', 'zip', 'country', 'lifecyclestage',
          'createdate', 'lastmodifieddate',
          // DNC and compliance properties
          'do_not_call', 'dnc_flag', 'dnc_date', 'dnc_reason',
          'optout', 'optout_date', 'federal_dnc', 'federal_dnc_date',
          'state_dnc', 'state_dnc_date', 'wireless_dnc', 'wireless_dnc_date',
          'compliance_notes'
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
            'firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle',
            'address', 'city', 'state', 'zip', 'country', 'lifecyclestage',
            'createdate', 'lastmodifieddate',
            // DNC and compliance properties
            'do_not_call', 'dnc_flag', 'dnc_date', 'dnc_reason',
            'optout', 'optout_date', 'federal_dnc', 'federal_dnc_date',
            'state_dnc', 'state_dnc_date', 'wireless_dnc', 'wireless_dnc_date',
            'compliance_notes'
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