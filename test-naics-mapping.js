require('dotenv').config();
const axios = require('axios');

// Import our services (without mongoose connection)
const fieldMappingService = require('./src/services/fieldMappingService');
const mappingService = new fieldMappingService();

async function testNAICSMapping() {
  try {
    console.log('🧪 === TESTING NAICS FIELD MAPPING ===');
    console.log('🔍 Testing HubSpot to NAICS field transformation...\n');
    
    // Fetch a sample contact from HubSpot
    const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        limit: 1,
        properties: [
          // NAICS Standard Fields (matching hubspotprospere.csv)
          'firstname', 'lastname', 'jobtitle', 'linkedin_profile_url', 'email', 'phone',
          'company', 'website', 'business_category___industry_of_interest', 'naics_code',
          'numemployees', 'year_established', 'office_phone', 'address', 'city', 'state', 'zip',
          'lead_source', 'contact_type', 'hs_email_last_send_date'
        ].join(',')
      }
    });
    
    if (!response.data.results || response.data.results.length === 0) {
      console.log('❌ No contacts found in HubSpot');
      return;
    }
    
    const hubspotContact = response.data.results[0];
    console.log('📋 Raw HubSpot Contact Data:');
    console.log('   ID:', hubspotContact.id);
    console.log('   Properties:', JSON.stringify(hubspotContact.properties, null, 2));
    
    // Test our field mapping
    const fieldMappingService = new FieldMappingService();
    const naicsContact = fieldMappingService.mapHubSpotToContact(hubspotContact);
    
    console.log('\n🎯 Transformed NAICS Contact:');
    console.log('   firstName:', naicsContact.firstName);
    console.log('   lastName:', naicsContact.lastName);
    console.log('   email:', naicsContact.email);
    console.log('   phone:', naicsContact.phone);
    console.log('   company:', naicsContact.company);
    console.log('   jobTitle:', naicsContact.jobTitle);
    console.log('   industry:', naicsContact.industry);
    console.log('   naicsCode:', naicsContact.naicsCode);
    console.log('   companyWebsiteURL:', naicsContact.companyWebsiteURL);
    console.log('   numberOfEmployees:', naicsContact.numberOfEmployees);
    console.log('   yearCompanyEstablished:', naicsContact.yearCompanyEstablished);
    console.log('   companyPhoneNumber:', naicsContact.companyPhoneNumber);
    console.log('   companyStreetAddress:', naicsContact.companyStreetAddress);
    console.log('   companyCity:', naicsContact.companyCity);
    console.log('   companyState:', naicsContact.companyState);
    console.log('   companyZipCode:', naicsContact.companyZipCode);
    console.log('   leadSource:', naicsContact.leadSource);
    console.log('   campaignCategory:', naicsContact.campaignCategory);
    console.log('   lastCampaignDate:', naicsContact.lastCampaignDate);
    console.log('   contactLinkedInProfile:', naicsContact.contactLinkedInProfile);
    
    console.log('\n📊 Field Mapping Summary:');
    const mappedFields = Object.keys(naicsContact).filter(key => 
      naicsContact[key] && naicsContact[key] !== '' && !['source', 'sourceId', 'leadSource'].includes(key)
    );
    console.log(`   ✅ Successfully mapped ${mappedFields.length} fields`);
    console.log(`   📋 Mapped fields: ${mappedFields.join(', ')}`);
    
    // Test CSV export format
    console.log('\n📄 CSV Export Row (NAICS Format):');
    const csvRow = fieldMappingService.contactToCSVRow(naicsContact);
    const headers = fieldMappingService.getExportHeaders();
    
    console.log('   Headers:', headers.join(' | '));
    console.log('   Values: ', csvRow.join(' | '));
    
    console.log('\n✅ NAICS field mapping test completed successfully!');
    console.log('🎯 All HubSpot contacts will be transformed to this NAICS format during sync.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testNAICSMapping();