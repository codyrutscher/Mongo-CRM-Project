require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Contact = require('../src/models/Contact');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

async function uploadCSV() {
  console.log('Uploading Enriched - Deal Maverick-ZoomInfo.csv\n');
  console.log('='.repeat(70));
  
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to Prospere CRM\n');
  
  const contacts = [];
  const csvPath = 'Enriched - Deal Maverick-ZoomInfo.csv';
  
  return new Promise((resolve) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        // Map CSV columns to Contact model
        const contact = {
          // Basic Info
          firstName: row['Fast Name'] || row['First Name'] || '',
          lastName: row['Last Name'] || '',
          email: row['Email Address'] || row['Email'] || '',
          phone: row['Personal Phone Number'] || row['Phone'] || '',
          jobTitle: row['Job Title'] || '',
          contactLinkedInProfile: row['LinkedIn Profile'] || '',
          
          // Company Info
          company: row['Company Name'] || '',
          companyWebsiteURL: row['Website URL'] || '',
          industry: row['Industry'] || '',
          naicsCode: row['NAICS Code'] || '',
          numberOfEmployees: row['Number of'] || '',
          yearCompanyEstablished: row['Year Established'] || '',
          companyPhoneNumber: row['Company Phone'] || '',
          companyStreetAddress: row['Company Street Address'] || '',
          companyCity: row['Company City'] || '',
          companyState: row['Company State'] || '',
          companyZipCode: row['Company Zip Code'] || '',
          
          // Lead Info
          leadSource: row['Lead Source'] || 'Zoominfo',
          campaignCategory: row['Campaign Category'] || '',
          
          // NEW FIELDS
          campaignType: row['Campaign Category'] || '', // Use Campaign Category as Campaign Type
          
          // System fields
          source: 'csv_upload',
          sourceId: `csv_deal_maverick_${Date.now()}_${contacts.length}`,
          lifecycleStage: 'lead',
          status: 'active'
        };
        
        // Only add if has email
        if (contact.email && contact.email.includes('@')) {
          contacts.push(contact);
        }
      })
      .on('end', async () => {
        console.log(`Parsed ${contacts.length} contacts from CSV\n`);
        
        let created = 0;
        let updated = 0;
        let errors = 0;
        
        console.log('Uploading to Prospere CRM...\n');
        
        for (let i = 0; i < contacts.length; i++) {
          if ((i + 1) % 1000 === 0) {
            console.log(`  Processed ${i + 1}/${contacts.length}...`);
          }
          
          try {
            const contactData = contacts[i];
            
            // Try to find existing contact by email
            const existing = await Contact.findOne({ email: contactData.email });
            
            if (existing) {
              // Update existing
              Object.assign(existing, contactData);
              existing.lastSyncedAt = new Date();
              await existing.save();
              updated++;
            } else {
              // Create new
              const newContact = new Contact(contactData);
              await newContact.save();
              created++;
            }
          } catch (error) {
            errors++;
            if (errors < 10) {
              console.error(`  Error: ${error.message}`);
            }
          }
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('UPLOAD COMPLETE');
        console.log('='.repeat(70));
        console.log(`Total in CSV: ${contacts.length}`);
        console.log(`Created: ${created}`);
        console.log(`Updated: ${updated}`);
        console.log(`Errors: ${errors}`);
        console.log('='.repeat(70));
        
        await mongoose.disconnect();
        resolve();
      });
  });
}

uploadCSV();
