const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const fs = require('fs');
const csv = require('csv-parser');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function addMissing7Contacts() {
  console.log('Adding the 7 missing contacts from contacts2.csv...');
  
  try {
    // The 7 missing contact IDs we identified
    const missingIds = [
      '159512612897',
      '159524538392', 
      '159552911493',
      '159552787068',
      '159522361243',
      '159552971031',
      '159552784525'
    ];
    
    console.log(`🔍 Looking for these ${missingIds.length} contacts in contacts2.csv...`);
    
    // Read contacts2.csv file to get the full data for these contacts
    const contactsToAdd = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('contacts2.csv')
        .pipe(csv())
        .on('data', (row) => {
          const hubspotId = row['Record ID'];
          if (missingIds.includes(hubspotId)) {
            contactsToAdd.push({
              id: hubspotId,
              firstName: row['First Name'] || '',
              lastName: row['Last Name'] || '',
              email: row['Email'] || '',
              phone: row['Phone Number'] || '',
              company: row['Company Name'] || '',
              contactOwner: row['Contact owner'] || '',
              leadStatus: row['Lead Status'] || '',
              createDate: row['Create Date'] || '',
              naicsCode: row['NAICS Code'] || '',
              doNotCall: row['Do Not Call'] || '',
              associatedCompany: row['Associated Company'] || ''
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📋 Found ${contactsToAdd.length} contacts to add:`);
    contactsToAdd.forEach((contact, index) => {
      console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - ${contact.company} - ID: ${contact.id}`);
    });
    
    if (contactsToAdd.length > 0) {
      console.log('\n📥 Adding contacts to database...');
      
      const contactsToInsert = contactsToAdd.map(contact => ({
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        company: contact.company,
        naicsCode: contact.naicsCode,
        source: 'hubspot',
        sourceId: contact.id,
        lifecycleStage: 'lead',
        leadSource: 'hubspot_contacts2_csv',
        // Set DNC status based on the "Do Not Call" column
        dncStatus: contact.doNotCall === 'true' || contact.doNotCall === 'True' || contact.doNotCall === '1' ? 'dnc_internal' : 'callable',
        dncDate: contact.doNotCall === 'true' || contact.doNotCall === 'True' || contact.doNotCall === '1' ? new Date() : null,
        dncReason: contact.doNotCall === 'true' || contact.doNotCall === 'True' || contact.doNotCall === '1' ? 'HubSpot Do Not Call flag' : null,
        sourceMetadata: {
          hubspotId: contact.id,
          contactOwner: contact.contactOwner,
          leadStatus: contact.leadStatus,
          contacts2CsvImport: true,
          importDate: new Date().toISOString()
        },
        lastSyncedAt: new Date(),
        createdAt: contact.createDate ? new Date(contact.createDate) : new Date(),
        updatedAt: new Date()
      }));
      
      try {
        const insertResult = await Contact.insertMany(contactsToInsert, { ordered: false });
        console.log(`✅ Successfully added ${insertResult.length} contacts`);
        
        // Show DNC status for added contacts
        const dncContacts = contactsToInsert.filter(c => c.dncStatus !== 'callable');
        if (dncContacts.length > 0) {
          console.log(`🚫 ${dncContacts.length} of the added contacts are marked as DNC`);
        }
        
      } catch (error) {
        console.log(`⚠️ Some contacts may have been duplicates:`, error.message);
      }
    }
    
    // Final verification
    console.log('\n📊 Final verification...');
    const finalCount = await Contact.countDocuments({ source: 'hubspot' });
    
    console.log(`Database contacts after adding: ${finalCount}`);
    console.log(`contacts2.csv contacts: 135,992`);
    console.log(`Match: ${finalCount === 135992 ? '✅ PERFECT' : finalCount > 135992 ? '⚠️ MORE' : '❌ LESS'}`);
    console.log(`Difference: ${finalCount - 135992}`);
    
    if (finalCount === 135992) {
      console.log('🎉 SUCCESS! Database now matches contacts2.csv exactly!');
    }
    
  } catch (error) {
    console.error('Error during contact addition:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the addition
addMissing7Contacts()
  .then(() => {
    console.log('\nMissing contacts addition complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Addition failed:', error);
    process.exit(1);
  });