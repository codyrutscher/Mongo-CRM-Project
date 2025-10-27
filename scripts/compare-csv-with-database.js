const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const fs = require('fs');
const csv = require('csv-parser');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function compareCsvWithDatabase() {
  console.log('Comparing all-contacts.csv with database...');
  
  try {
    // First, let's analyze the CSV file
    console.log('📄 Analyzing CSV file...');
    
    const csvContacts = [];
    const csvContactIds = new Set();
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('all-contacts.csv')
        .pipe(csv())
        .on('data', (row) => {
          // Extract the HubSpot ID from the CSV - it's in "Record ID"
          const hubspotId = row['Record ID'];
          if (hubspotId && hubspotId !== '' && hubspotId !== 'Record ID') {
            csvContacts.push({
              id: hubspotId,
              firstName: row['First Name'] || '',
              lastName: row['Last Name'] || '',
              email: row['Email'] || '',
              company: row['Company Name'] || '',
              contactOwner: row['Contact owner'] || '',
              leadStatus: row['Lead Status'] || '',
              createDate: row['Create Date'] || '',
              row: row
            });
            csvContactIds.add(hubspotId);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📊 CSV file contains ${csvContacts.length} contacts`);
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
    console.log('\n🔍 Comparing CSV vs Database...');
    
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
    
    console.log(`📊 Contacts in CSV but missing from DB: ${missingInDb.length}`);
    console.log(`📊 Contacts in DB but missing from CSV: ${missingInCsv.length}`);
    
    // Show samples of missing contacts
    if (missingInDb.length > 0) {
      console.log('\n❌ Sample contacts missing from database (first 10):');
      missingInDb.slice(0, 10).forEach((contact, index) => {
        console.log(`  ${index + 1}. ID: ${contact.id} - ${contact.firstName} ${contact.lastName} (${contact.email})`);
      });
    }
    
    if (missingInCsv.length > 0) {
      console.log('\n❌ Sample contacts missing from CSV (first 10):');
      missingInCsv.slice(0, 10).forEach((contact, index) => {
        console.log(`  ${index + 1}. ID: ${contact.sourceId} - ${contact.firstName} ${contact.lastName} (${contact.email})`);
      });
    }
    
    // Calculate match percentage
    const totalUnique = new Set([...csvContactIds, ...dbContactIds]).size;
    const matches = csvContactIds.size + dbContactIds.size - totalUnique;
    const matchPercentage = ((matches / Math.max(csvContactIds.size, dbContactIds.size)) * 100).toFixed(2);
    
    console.log(`\n📊 Match Analysis:`);
    console.log(`Total unique contacts across both: ${totalUnique}`);
    console.log(`Matching contacts: ${matches}`);
    console.log(`Match percentage: ${matchPercentage}%`);
    
    // If we need to import missing contacts
    if (missingInDb.length > 0) {
      console.log(`\n🔄 Found ${missingInDb.length} contacts that need to be imported from CSV`);
      console.log('These contacts exist in HubSpot CSV but not in our database');
      
      // We could import them here, but let's first understand why they're missing
      console.log('\n🔍 Analyzing why contacts are missing...');
      
      // Check if any of the missing contacts have empty or invalid IDs
      const invalidIds = missingInDb.filter(c => !c.id || c.id.length < 3);
      console.log(`Contacts with invalid IDs: ${invalidIds.length}`);
      
      // Check if any are test contacts
      const testContacts = missingInDb.filter(c => 
        c.firstName?.toLowerCase().includes('test') || 
        c.lastName?.toLowerCase().includes('test') ||
        c.email?.toLowerCase().includes('test')
      );
      console.log(`Test contacts: ${testContacts.length}`);
    }
    
    if (missingInCsv.length > 0) {
      console.log(`\n🔄 Found ${missingInCsv.length} contacts in database but not in CSV`);
      console.log('These might be contacts that were deleted from HubSpot after CSV export');
    }
    
    // Summary
    console.log(`\n📋 Summary:`);
    console.log(`CSV contacts: ${csvContacts.length}`);
    console.log(`Database contacts: ${dbContacts.length}`);
    console.log(`Should match: ${csvContacts.length === dbContacts.length ? '✅ YES' : '❌ NO'}`);
    console.log(`Missing from DB: ${missingInDb.length}`);
    console.log(`Extra in DB: ${missingInCsv.length}`);
    
  } catch (error) {
    console.error('Error during comparison:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the comparison
compareCsvWithDatabase()
  .then(() => {
    console.log('\nCSV comparison complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Comparison failed:', error);
    process.exit(1);
  });