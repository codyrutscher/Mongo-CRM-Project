require('dotenv').config();
const axios = require('axios');

async function checkHubSpotFields() {
  console.log('🔍 === CHECKING HUBSPOT FIELD NAMES ===');
  
  const headers = {
    'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  try {
    console.log('📋 Fetching all available contact properties from HubSpot...');
    
    // Get all contact properties
    const response = await axios.get('https://api.hubapi.com/crm/v3/properties/contacts', {
      headers
    });
    
    if (response.data.results) {
      const properties = response.data.results;
      console.log(`📊 Found ${properties.length} total properties`);
      
      // Look for company-related fields
      console.log('\n🏢 COMPANY-RELATED FIELDS:');
      const companyFields = properties.filter(prop => 
        prop.name.toLowerCase().includes('company') || 
        prop.label.toLowerCase().includes('company')
      );
      
      companyFields.forEach(field => {
        console.log(`  ${field.name} - "${field.label}" (${field.type})`);
      });
      
      // Look for DNC/call-related fields
      console.log('\n🚫 DNC/CALL-RELATED FIELDS:');
      const dncFields = properties.filter(prop => 
        prop.name.toLowerCase().includes('call') || 
        prop.name.toLowerCase().includes('dnc') ||
        prop.name.toLowerCase().includes('not_call') ||
        prop.label.toLowerCase().includes('call') ||
        prop.label.toLowerCase().includes('dnc')
      );
      
      dncFields.forEach(field => {
        console.log(`  ${field.name} - "${field.label}" (${field.type})`);
      });
      
      // Look for interested_in alternatives
      console.log('\n🎯 INTEREST-RELATED FIELDS:');
      const interestFields = properties.filter(prop => 
        prop.name.toLowerCase().includes('interest') || 
        prop.label.toLowerCase().includes('interest')
      );
      
      interestFields.forEach(field => {
        console.log(`  ${field.name} - "${field.label}" (${field.type})`);
      });
      
      // Check if our problematic fields exist with different names
      console.log('\n🔍 CHECKING PROBLEMATIC FIELDS:');
      
      const problematicFields = ['company', 'interested_in', 'do_not_call'];
      
      problematicFields.forEach(fieldName => {
        const field = properties.find(p => p.name === fieldName);
        if (field) {
          console.log(`  ✅ ${fieldName} exists: "${field.label}" (${field.type})`);
        } else {
          console.log(`  ❌ ${fieldName} NOT FOUND`);
          
          // Look for similar fields
          const similar = properties.filter(p => 
            p.name.includes(fieldName.replace('_', '')) || 
            p.label.toLowerCase().includes(fieldName.replace('_', ' '))
          );
          
          if (similar.length > 0) {
            console.log(`     Similar fields found:`);
            similar.forEach(s => {
              console.log(`       ${s.name} - "${s.label}"`);
            });
          }
        }
      });
      
      // Show all standard contact fields
      console.log('\n📋 STANDARD CONTACT FIELDS:');
      const standardFields = properties.filter(prop => 
        ['firstname', 'lastname', 'email', 'phone', 'jobtitle', 'website', 
         'city', 'state', 'country', 'address', 'zip'].includes(prop.name)
      );
      
      standardFields.forEach(field => {
        console.log(`  ✅ ${field.name} - "${field.label}"`);
      });
      
      // Check for custom fields that might be alternatives
      console.log('\n🔧 CUSTOM FIELDS (first 20):');
      const customFields = properties.filter(prop => prop.name.startsWith('hs_') === false)
        .slice(0, 20);
      
      customFields.forEach(field => {
        console.log(`  ${field.name} - "${field.label}" (${field.type})`);
      });
      
    } else {
      console.log('❌ No properties found in response');
    }
    
  } catch (error) {
    console.error('❌ Error fetching HubSpot properties:', error.response?.status, error.message);
    
    if (error.response?.status === 403) {
      console.log('💡 This might be a permissions issue. Make sure your HubSpot token has access to contact properties.');
    }
  }
}

checkHubSpotFields();