require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

async function verifyCompanySync() {
  try {
    console.log('🔍 === VERIFYING COMPANY DATA SYNC ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    // Check current database stats
    const totalContacts = await contactsCollection.countDocuments();
    const contactsWithCompany = await contactsCollection.countDocuments({
      company: { $ne: '', $exists: true, $ne: null }
    });
    const contactsWithoutCompany = totalContacts - contactsWithCompany;
    
    console.log(`\n📊 CURRENT DATABASE STATS:`);
    console.log(`📋 Total contacts: ${totalContacts}`);
    console.log(`🏢 Contacts with company: ${contactsWithCompany}`);
    console.log(`❌ Contacts without company: ${contactsWithoutCompany}`);
    console.log(`📊 Company fill rate: ${((contactsWithCompany / totalContacts) * 100).toFixed(1)}%`);
    
    // Sample contacts with company data
    console.log(`\n📋 SAMPLE CONTACTS WITH COMPANY DATA:`);
    const samplesWithCompany = await contactsCollection.find({
      company: { $ne: '', $exists: true, $ne: null }
    }).limit(5).toArray();
    
    samplesWithCompany.forEach((contact, i) => {
      console.log(`  ${i + 1}. ${contact.firstName} ${contact.lastName} - ${contact.company} (${contact.email})`);
    });
    
    // Check if HubSpot actually has more company data
    console.log(`\n🔍 CHECKING HUBSPOT FOR COMPANY DATA...`);
    
    const headers = {
      'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    try {
      // Get a sample of HubSpot contacts with company data
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers,
        params: {
          properties: 'firstname,lastname,email,company',
          limit: 20
        }
      });
      
      if (response.data.results) {
        console.log(`\n📋 SAMPLE HUBSPOT CONTACTS:`);
        let hubspotWithCompany = 0;
        
        response.data.results.forEach((contact, i) => {
          const company = contact.properties.company;
          if (company && company.trim() !== '') {
            hubspotWithCompany++;
            console.log(`  ${i + 1}. ${contact.properties.firstname} ${contact.properties.lastname} - "${company}" (${contact.properties.email})`);
          } else {
            console.log(`  ${i + 1}. ${contact.properties.firstname} ${contact.properties.lastname} - [NO COMPANY] (${contact.properties.email})`);
          }
        });
        
        console.log(`\n📊 HubSpot sample: ${hubspotWithCompany}/${response.data.results.length} have company data`);
        console.log(`📊 Sample fill rate: ${((hubspotWithCompany / response.data.results.length) * 100).toFixed(1)}%`);
        
        if (hubspotWithCompany > 0) {
          console.log(`✅ HubSpot DOES have company data - sync should be working`);
        } else {
          console.log(`⚠️  No company data in HubSpot sample - this might be normal`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error checking HubSpot: ${error.response?.status}`);
    }
    
    // Check if the robust sync is still running
    const recentContacts = await contactsCollection.countDocuments({
      lastSyncedAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
    });
    
    console.log(`\n🔄 SYNC STATUS:`);
    console.log(`📊 Contacts synced in last 10 minutes: ${recentContacts}`);
    
    if (recentContacts > 0) {
      console.log(`✅ Sync appears to be running - company data should be populating`);
    } else {
      console.log(`⚠️  No recent sync activity detected`);
    }
    
    // Expected vs actual
    console.log(`\n🎯 EXPECTED VS ACTUAL:`);
    console.log(`📊 You expect: ~51,000 contacts with company data`);
    console.log(`📊 Currently have: ${contactsWithCompany} contacts with company data`);
    
    if (contactsWithCompany < 51000) {
      console.log(`📊 Missing: ~${51000 - contactsWithCompany} contacts with company data`);
      console.log(`💡 This suggests the sync is still in progress or there's a data issue`);
    } else {
      console.log(`✅ Company data looks good!`);
    }
    
  } catch (error) {
    console.error('💥 Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

verifyCompanySync();