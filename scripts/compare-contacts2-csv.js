const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const fs = require('fs');
const csv = require('csv-parser');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function compareContacts2Csv() {
  console.log('Comparing contacts2.csv with database...');
  
  try {
    // Read contacts2.csv file
    console.log('📄 Reading contacts2.csv file...');
    const csvContacts = [];
    const csvContactIds = new Set();
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('contacts2.csv')
        .pipe(csv())
        .on('data', (row) => {
          // Extract the HubSpot ID from the CSV - check different possible column names
          const hubspotId = row['Record ID'] || row['Contact ID'] || row['ID'] || row['id'];
          if (hubspotId && hubspotId !== '' && hubspotId !== 'Record ID') {
            csvContacts.push({
              id: hubspotId,
              firstName: row['First Name'] || row['firstName'] || '',
              lastName: row['Last Name'] || row['lastName'] || '',
              email: row['Email'] || row['email'] || '',
              company: row['Company Name'] || row['company'] || '',
              row: row
            });
            csvContactIds.add(hubspotId);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📊 contacts2.csv contains ${csvContacts.length} contacts`);
    console.log(`📊 Unique contact IDs in CSV: ${csvContactIds.size}`);
    
    // Show CSV headers to understand the structure
    if (csvContacts.length > 0) {
      console.log('\n📋 CSV Headers:', Object.keys(csvContacts[0].row));
      console.log('\n📋 Sample CSV contact:');
      console.log(`  ID: ${csvContacts[0].id}`);
      console.log(`  Name: ${csvContacts[0].firstName} ${csvContacts[0].lastName}`);
      console.log(`  Email: ${csvContacts[0].email}`);
      console.log(`  Company: ${csvContacts[0].company}`);
    }
    
    // Get database contacts
    console.log('\n🗄️ Getting database contacts...');
    const dbContacts = await Contact.find({ source: 'hubspot' }, 'sourceId firstName lastName email company').lean();
    const dbContactIds = new Set(dbContacts.map(c => c.sourceId));
    
    console.log(`📊 Database contains ${dbContacts.length} HubSpot contacts`);
    console.log(`📊 Unique contact IDs in DB: ${dbContactIds.size}`);
    
    // Compare the two sets
    console.log('\n🔍 Comparing contacts2.csv vs Database...');
    
    // Find contacts in CSV but not in database
    const missingInDb = [];
    csvContactIds.forEach(id => {
      if (!dbContactIds.has(id)) {
        const csvContact = csvContacts.find(c => c.id === id);
        missingInDb.push(csvContact);
      }
    });
    
    // Find contacts in database but not in CSV
    const missingInCsv = [];
    dbContactIds.forEach(id => {
      if (!csvContactIds.has(id)) {
        const dbContact = dbContacts.find(c => c.sourceId === id);
        missingInCsv.push(dbContact);
      }
    });
    
    console.log(`📊 Contacts in contacts2.csv but missing from DB: ${missingInDb.length}`);
    console.log(`📊 Contacts in DB but missing from contacts2.csv: ${missingInCsv.length}`);
    
    // Show the different contacts
    if (missingInDb.length > 0) {
      console.log('\n❌ Contacts in contacts2.csv but missing from database:');
      missingInDb.forEach((contact, index) => {
        console.log(`  ${index + 1}. ID: ${contact.id} - ${contact.firstName} ${contact.lastName} (${contact.email}) - ${contact.company}`);
      });
    }
    
    if (missingInCsv.length > 0) {
      console.log('\n❌ Contacts in database but missing from contacts2.csv:');
      missingInCsv.slice(0, 20).forEach((contact, index) => { // Show first 20
        console.log(`  ${index + 1}. ID: ${contact.sourceId} - ${contact.firstName} ${contact.lastName} (${contact.email}) - ${contact.company}`);
      });
      
      if (missingInCsv.length > 20) {
        console.log(`  ... and ${missingInCsv.length - 20} more contacts`);
      }
    }
    
    // Calculate match percentage
    const totalUnique = new Set([...csvContactIds, ...dbContactIds]).size;
    const matches = csvContactIds.size + dbContactIds.size - totalUnique;
    const matchPercentage = ((matches / Math.max(csvContactIds.size, dbContactIds.size)) * 100).toFixed(2);
    
    console.log(`\n📊 Match Analysis:`);
    console.log(`CSV contacts: ${csvContactIds.size}`);
    console.log(`Database contacts: ${dbContactIds.size}`);
    console.log(`Total unique contacts across both: ${totalUnique}`);
    console.log(`Matching contacts: ${matches}`);
    console.log(`Match percentage: ${matchPercentage}%`);
    console.log(`Difference: ${Math.abs(csvContactIds.size - dbContactIds.size)}`);
    
    // If there are exactly 6 differences, show them clearly
    if (Math.abs(csvContactIds.size - dbContactIds.size) <= 10) {
      console.log('\n🎯 The 6 (or close) different contacts:');
      
      if (missingInDb.length > 0) {
        console.log('\n📥 Need to ADD to database:');
        missingInDb.forEach((contact, index) => {
          console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.id}`);
        });
      }
      
      if (missingInCsv.length > 0 && missingInCsv.length <= 10) {
        console.log('\n🗑️ Need to REMOVE from database:');
        missingInCsv.forEach((contact, index) => {
          console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error during comparison:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the comparison
compareContacts2Csv()
  .then(() => {
    console.log('\ncontacts2.csv comparison complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Comparison failed:', error);
    process.exit(1);
  });