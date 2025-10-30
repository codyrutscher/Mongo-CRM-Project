require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const hubspotService = require('../src/services/hubspotService');

const apiId = process.env.RESPONSE_GENIUS_API_ID;
const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
const baseUrl = process.env.RESPONSE_GENIUS_API_URL || 'https://control.responsegenius.com/rest';

async function testHubSpotContact(email) {
  try {
    console.log('🧪 Testing HubSpot to Response Genius Sync\n');
    console.log(`Email: ${email}\n`);
    
    // Connect to database
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Find contact in database
    let contact = await Contact.findOne({ email: email });
    
    if (!contact) {
      console.log('Contact not in database, fetching from HubSpot...');
      
      // Search HubSpot for this contact
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
      console.log('✅ Found in HubSpot');
      
      // Transform and save to database
      const contactData = hubspotService.transformContactData(hubspotContact);
      contact = new Contact(contactData);
      await contact.save();
      console.log('✅ Saved to database\n');
    }
    
    console.log('Contact Details:');
    console.log(`  Name: ${contact.firstName} ${contact.lastName}`);
    console.log(`  Email: ${contact.email}`);
    console.log(`  Phone: ${contact.phone || 'N/A'}`);
    console.log('\nDNC/Cold Lead Status:');
    console.log(`  DNC Seller: ${contact.dnc___seller_outreach || false}`);
    console.log(`  DNC Buyer: ${contact.dnc___buyer_outreach || false}`);
    console.log(`  DNC CRE: ${contact.dnc___cre_outreach || false}`);
    console.log(`  DNC EXF: ${contact.dnc___exf_outreach || false}`);
    console.log(`  Cold Seller: ${contact.seller_cold_lead || false}`);
    console.log(`  Cold Buyer: ${contact.buyer_cold_lead || false}`);
    console.log(`  Cold CRE: ${contact.cre_cold_lead || false}`);
    console.log(`  Cold EXF: ${contact.exf_cold_lead || false}`);
    
    // Determine which lists to add to
    const listsToAdd = [];
    if (contact.dnc___seller_outreach) listsToAdd.push({ id: process.env.RESPONSE_GENIUS_DNC_SELLER_LIST_ID, name: 'DNC Seller' });
    if (contact.dnc___buyer_outreach) listsToAdd.push({ id: process.env.RESPONSE_GENIUS_DNC_BUYER_LIST_ID, name: 'DNC Buyer' });
    if (contact.dnc___cre_outreach) listsToAdd.push({ id: process.env.RESPONSE_GENIUS_DNC_CRE_LIST_ID, name: 'DNC CRE' });
    if (contact.dnc___exf_outreach) listsToAdd.push({ id: process.env.RESPONSE_GENIUS_DNC_EXF_LIST_ID, name: 'DNC EXF' });
    if (contact.seller_cold_lead) listsToAdd.push({ id: process.env.RESPONSE_GENIUS_COLD_SELLER_LIST_ID, name: 'Cold Seller' });
    if (contact.buyer_cold_lead) listsToAdd.push({ id: process.env.RESPONSE_GENIUS_COLD_BUYER_LIST_ID, name: 'Cold Buyer' });
    if (contact.cre_cold_lead) listsToAdd.push({ id: process.env.RESPONSE_GENIUS_COLD_CRE_LIST_ID, name: 'Cold CRE' });
    if (contact.exf_cold_lead) listsToAdd.push({ id: process.env.RESPONSE_GENIUS_COLD_EXF_LIST_ID, name: 'Cold EXF' });
    
    if (listsToAdd.length === 0) {
      console.log('\n⚠️  Contact has no DNC or Cold Lead flags set');
      console.log('Set one of these properties in HubSpot to test the sync');
      process.exit(0);
    }
    
    console.log(`\n📋 Adding to ${listsToAdd.length} Response Genius list(s)...\n`);
    
    for (const list of listsToAdd) {
      try {
        const response = await axios.get(`${baseUrl}/lists/subscribe_user`, {
          params: {
            api_id: apiId,
            api_key: apiKey,
            list_api_identifier: list.id,
            email_address: contact.email,
            first_name: contact.firstName || '',
            last_name: contact.lastName || '',
            phone: contact.phone || '',
            list_preference: 'optin',
            force_subscribe: 'Y'
          }
        });
        
        console.log(`✅ ${list.name}: Added successfully`);
        if (response.data) {
          console.log(`   Response: ${JSON.stringify(response.data)}`);
        }
      } catch (error) {
        console.log(`❌ ${list.name}: ${error.response?.data?.reason || error.message}`);
      }
    }
    
    console.log('\n✅ Test complete!');
    console.log('\nNext steps:');
    console.log('1. Check Response Genius dashboard to verify contact was added');
    console.log('2. Update the contact in HubSpot to test webhook sync');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await mongoose.connection.close();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/test-hubspot-to-rg-sync.js <email>');
  console.log('Example: node scripts/test-hubspot-to-rg-sync.js test@example.com');
  process.exit(1);
}

testHubSpotContact(email);
