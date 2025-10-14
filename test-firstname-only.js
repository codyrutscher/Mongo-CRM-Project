require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

async function testFirstnameOnly() {
  try {
    console.log('🧪 === TESTING FIRSTNAME-ONLY SYNC ===');
    console.log('Testing if 500 errors are field-specific or data corruption');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    let totalFetched = 0;
    let after = null;
    let pageCount = 0;
    let errorCount = 0;
    let allContacts = [];
    
    console.log('\n📡 Fetching ALL contacts with ONLY firstname field...');
    
    while (pageCount < 1500) { // Test up to 150K contacts (1500 pages x 100)
      try {
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params: {
            properties: 'firstname', // ONLY firstname field
            limit: 100,
            ...(after && { after })
          },
          timeout: 30000
        });

        if (response.data.results && response.data.results.length > 0) {
          allContacts.push(...response.data.results);
          totalFetched += response.data.results.length;
          pageCount++;
          
          if (pageCount % 10 === 0) {
            console.log(`📊 Page ${pageCount}: Fetched ${totalFetched} contacts so far...`);
          }
          
          // Check for more pages
          if (response.data.paging && response.data.paging.next) {
            after = response.data.paging.next.after;
          } else {
            console.log('🏁 Reached end of all contacts!');
            break;
          }
          
          // Small delay
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } else {
          console.log('⚠️  Empty response, stopping');
          break;
        }

      } catch (error) {
        errorCount++;
        console.log(`❌ ERROR at page ${pageCount + 1} (after: ${after})`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.data?.message}`);
        console.log(`   Total fetched before error: ${totalFetched}`);
        
        if (error.response?.status === 500) {
          console.log(`🚨 STILL GETTING 500 ERROR with firstname-only!`);
          console.log(`   This confirms it's DATA corruption, not field issues`);
          break;
        }
        
        if (errorCount >= 3) {
          console.log('🛑 Too many consecutive errors, stopping');
          break;
        }
      }
    }
    
    console.log(`\n📊 FIRSTNAME-ONLY TEST RESULTS:`);
    console.log(`📋 Total contacts fetched: ${totalFetched}`);
    console.log(`📄 Pages processed: ${pageCount}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    console.log(`🔧 Last successful after token: ${after}`);
    
    if (totalFetched > 130000) {
      console.log('🎉 SUCCESS! Got almost all contacts with firstname-only');
      console.log('💡 This means the issue is with SPECIFIC FIELDS, not data corruption');
    } else if (errorCount > 0) {
      console.log('🚨 Still hit errors with firstname-only');
      console.log('💡 This confirms there is actual CONTACT DATA corruption in HubSpot');
    }
    
    // Quick save test - save a few contacts with minimal data
    if (allContacts.length > 0) {
      console.log('\n💾 Testing database save with firstname-only data...');
      
      const sampleContacts = allContacts.slice(0, 100).map(contact => ({
        firstName: contact.properties.firstname || '',
        source: 'hubspot-firstname-test',
        sourceId: contact.id,
        hubspotId: contact.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      try {
        const operations = sampleContacts.map(contact => ({
          updateOne: {
            filter: { source: 'hubspot-firstname-test', sourceId: contact.sourceId },
            update: { $set: contact },
            upsert: true
          }
        }));
        
        await contactsCollection.bulkWrite(operations);
        console.log('✅ Database save successful');
      } catch (error) {
        console.log('❌ Database save failed:', error.message);
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

testFirstnameOnly();
