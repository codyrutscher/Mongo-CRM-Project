require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const hubspotService = require('../src/services/hubspotService');

const apiId = process.env.RESPONSE_GENIUS_API_ID;
const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
const baseUrl = process.env.RESPONSE_GENIUS_API_URL || 'https://control.responsegenius.com/rest';

async function manualSync(email) {
  try {
    console.log('🔄 Manual Sync to Response Genius\n');
    
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Fetch latest from HubSpot
    console.log('Fetching latest data from HubSpot...');
    const hubspotResponse = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }],
        properties: ['firstname', 'lastname', 'email', 'phone', 'dnc___seller_outreach', 'dnc___buyer_outreach', 'dnc___cre_outreach', 'dnc___exf_outreach', 'seller_cold_lead', 'buyer_cold_lead', 'cre_cold_lead', 'exf_cold_lead']
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (hubspotResponse.data.results.length === 0) {
      console.log('❌ Contact not found in HubSpot');
      process.exit(1);
    }
    
    const hubspotContact = hubspotResponse.data.results[0];
    console.log('✅ Found in HubSpot\n');
    
    // Update database
    const contactData = hubspotService.transformContactData(hubspotContact);
    let contact = await Contact.findOne({ email: email });
    
    if (contact) {
      Object.assign(contact, contactData);
      await contact.save();
      console.log('✅ Updated in database\n');
    } else {
      contact = new Contact(contactData);
      await contact.save();
      console.log('✅ Created in database\n');
    }
    
    console.log('Contact Status:');
    console.log(`  DNC Buyer: ${contact.dnc___buyer_outreach || false}`);
    console.log(`  DNC Seller: ${contact.dnc___seller_outreach || false}`);
    console.log(`  DNC CRE: ${contact.dnc___cre_outreach || false}`);
    console.log(`  DNC EXF: ${contact.dnc___exf_outreach || false}`);
    
    // Sync to Response Genius
    const listId = process.env.RESPONSE_GENIUS_DNC_BUYER_LIST_ID;
    
    if (contact.dnc___buyer_outreach) {
      console.log(`\n📋 Adding to Response Genius list: ${listId}\n`);
      
      try {
        const response = await axios.get(`${baseUrl}/lists/subscribe_user`, {
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
        
        console.log('✅ Successfully added to Response Genius!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        console.log('\n🎉 SUCCESS! Check Response Genius dashboard to verify.');
        
      } catch (error) {
        console.log('❌ Failed to add to Response Genius');
        console.log('Error:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
          console.log('\n💡 The contact doesn\'t exist in Response Genius yet.');
          console.log('This is expected for new contacts.');
          console.log('Response Genius requires contacts to be created via CSV upload first.');
        }
      }
    } else {
      console.log('\n⚠️  DNC Buyer Outreach is not set to true');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

const email = process.argv[2] || 'drutscher@gmail.com';
manualSync(email);
