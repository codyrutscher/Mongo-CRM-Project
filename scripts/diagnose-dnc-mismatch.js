const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function diagnoseDncMismatch() {
  console.log('Diagnosing DNC mismatch between Prospere CRM and HubSpot...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  try {
    // Check our database
    console.log('\n📊 Prospere CRM Database Status:');
    const totalDb = await Contact.countDocuments({ source: 'hubspot' });
    const callableDb = await Contact.countDocuments({ source: 'hubspot', dncStatus: 'callable' });
    const dncDb = await Contact.countDocuments({ source: 'hubspot', dncStatus: { $ne: 'callable' } });
    
    console.log(`Total: ${totalDb}`);
    console.log(`Callable: ${callableDb}`);
    console.log(`DNC: ${dncDb}`);
    
    // Sample some contacts to see their DNC status
    console.log('\n🔍 Sample contacts from database:');
    const sampleContacts = await Contact.find({ source: 'hubspot' }).limit(10);
    
    for (const contact of sampleContacts) {
      console.log(`  ${contact.firstName} ${contact.lastName} - dncStatus: ${contact.dncStatus} - ID: ${contact.sourceId}`);
    }
    
    // Now fetch the same contacts from HubSpot to compare
    console.log('\n🔍 Checking same contacts in HubSpot:');
    
    for (const contact of sampleContacts.slice(0, 5)) { // Check first 5
      try {
        const response = await axios.get(`https://api.hubapi.com/crm/v3/objects/contacts/${contact.sourceId}`, {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            properties: 'firstname,lastname,hs_do_not_call,do_not_call,dnc_flag,hs_email_optout'
          }
        });
        
        const props = response.data.properties;
        console.log(`  ${props.firstname} ${props.lastname}:`);
        console.log(`    hs_do_not_call: ${props.hs_do_not_call}`);
        console.log(`    do_not_call: ${props.do_not_call}`);
        console.log(`    dnc_flag: ${props.dnc_flag}`);
        console.log(`    hs_email_optout: ${props.hs_email_optout}`);
        console.log(`    Our dncStatus: ${contact.dncStatus}`);
        
        // Check if there's a mismatch
        const hubspotIsDnc = props.hs_do_not_call === 'true' || props.do_not_call === 'true' || props.dnc_flag === 'true';
        const ourIsDnc = contact.dncStatus !== 'callable';
        
        if (hubspotIsDnc !== ourIsDnc) {
          console.log(`    ⚠️ MISMATCH! HubSpot says DNC: ${hubspotIsDnc}, We say DNC: ${ourIsDnc}`);
        }
        
      } catch (error) {
        console.log(`    ❌ Error fetching from HubSpot: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Check if we're using the wrong logic
    console.log('\n🔍 Checking DNC logic in database:');
    
    // Find contacts marked as DNC
    const dncContacts = await Contact.find({ 
      source: 'hubspot', 
      dncStatus: { $ne: 'callable' } 
    }).limit(5);
    
    console.log('\nContacts marked as DNC in our database:');
    for (const contact of dncContacts) {
      console.log(`  ${contact.firstName} ${contact.lastName}`);
      console.log(`    dncStatus: ${contact.dncStatus}`);
      console.log(`    dncReason: ${contact.dncReason}`);
      console.log(`    customFields.hubspotDoNotCall: ${contact.customFields?.hubspotDoNotCall}`);
    }
    
    // Find contacts marked as callable
    const callableContacts = await Contact.find({ 
      source: 'hubspot', 
      dncStatus: 'callable' 
    }).limit(5);
    
    console.log('\nContacts marked as Callable in our database:');
    for (const contact of callableContacts) {
      console.log(`  ${contact.firstName} ${contact.lastName}`);
      console.log(`    dncStatus: ${contact.dncStatus}`);
      console.log(`    customFields.hubspotDoNotCall: ${contact.customFields?.hubspotDoNotCall}`);
    }
    
    // Check the DNC list membership
    console.log('\n🔍 Checking HubSpot DNC List (6199) membership:');
    
    try {
      const listResponse = await axios.get('https://api.hubapi.com/crm/v3/lists/6199/memberships', {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 10
        }
      });
      
      console.log(`Found ${listResponse.data.results?.length || 0} contacts in DNC list (showing first 10)`);
      
      if (listResponse.data.results) {
        for (const membership of listResponse.data.results.slice(0, 5)) {
          const contactId = membership.recordId;
          
          // Check if this contact is in our database
          const ourContact = await Contact.findOne({ source: 'hubspot', sourceId: contactId });
          
          if (ourContact) {
            console.log(`  Contact ${contactId}: ${ourContact.firstName} ${ourContact.lastName}`);
            console.log(`    In DNC List 6199: YES`);
            console.log(`    Our dncStatus: ${ourContact.dncStatus}`);
            
            if (ourContact.dncStatus === 'callable') {
              console.log(`    ⚠️ MISMATCH! Contact is in DNC list but marked as callable in our DB`);
            }
          }
        }
      }
      
    } catch (error) {
      console.log(`Error checking DNC list: ${error.message}`);
    }
    
    console.log('\n📊 Summary:');
    console.log(`Prospere CRM - Callable: ${callableDb}, DNC: ${dncDb}`);
    console.log(`HubSpot - Callable: ~62,910, DNC: ~73,388`);
    console.log(`Difference - Callable: ${callableDb - 62910}, DNC: ${dncDb - 73388}`);
    
  } catch (error) {
    console.error('Error during diagnosis:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the diagnosis
diagnoseDncMismatch()
  .then(() => {
    console.log('\nDiagnosis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Diagnosis failed:', error);
    process.exit(1);
  });