require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

// Map CSV files to properties
const fileMapping = {
  'dnc-seller-outreach.csv': 'dnc___seller_outreach',
  'dnc-buyer-outreach.csv': 'dnc___buyer_outreach',
  'dnc-cre-outreach.csv': 'dnc___cre_outreach',
  'dnc-exf-outreach.csv': 'dnc___exf_outreach',
  'hubspot-crm-exports-seller-cold-2025-10-23.csv': 'seller_cold_lead',
  'buyer-cold.csv': 'buyer_cold_lead',
  'hubspot-crm-exports-cre-cold-2025-10-23.csv': 'cre_cold_lead',
  'hubspot-crm-exports-exf-cold-2025-10-23.csv': 'exf_cold_lead'
};

async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const emails = [];
    let rowCount = 0;
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        // Try different possible email column names
        const email = row['Email'] || row['email'] || row['E-mail'] || row['EMAIL'];
        if (email && email.trim() && email.includes('@')) {
          emails.push(email.trim().toLowerCase());
        }
      })
      .on('end', () => {
        console.log(`  Parsed ${rowCount.toLocaleString()} rows`);
        resolve(emails);
      })
      .on('error', reject);
  });
}

async function importList(fileName, property) {
  const filePath = path.join(process.cwd(), 'cold-and-dnc-lists', fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ✗ File not found: ${fileName}`);
    return { success: false, error: 'File not found' };
  }
  
  console.log(`\n${property}:`);
  console.log(`  Reading ${fileName}...`);
  
  const emails = await readCSV(filePath);
  console.log(`  Found ${emails.length.toLocaleString()} emails in CSV`);
  
  if (emails.length === 0) {
    return { success: false, error: 'No emails found' };
  }
  
  // Update contacts in batches
  const batchSize = 1000;
  let updated = 0;
  let notFound = 0;
  
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    const result = await Contact.updateMany(
      { email: { $in: batch } },
      { $set: { [property]: true } }
    );
    
    updated += result.modifiedCount;
    notFound += (batch.length - result.modifiedCount);
    
    if ((i + batchSize) % 10000 === 0) {
      console.log(`    Processed ${Math.min(i + batchSize, emails.length).toLocaleString()}/${emails.length.toLocaleString()}...`);
    }
  }
  
  console.log(`  ✓ Updated: ${updated.toLocaleString()} contacts`);
  if (notFound > 0) {
    console.log(`  ⚠ Not found in Prospere: ${notFound.toLocaleString()} emails`);
  }
  
  return { success: true, updated, notFound, total: emails.length };
}

async function main() {
  try {
    console.log('Importing DNC & Cold Lead Lists from CSV Files\n');
    console.log('='.repeat(70));
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to Prospere CRM');
    
    const results = {};
    
    console.log('\nDNC LISTS:');
    console.log('-'.repeat(70));
    for (const [fileName, property] of Object.entries(fileMapping)) {
      if (property.startsWith('dnc___')) {
        results[property] = await importList(fileName, property);
      }
    }
    
    console.log('\nCOLD LEAD LISTS:');
    console.log('-'.repeat(70));
    for (const [fileName, property] of Object.entries(fileMapping)) {
      if (!property.startsWith('dnc___')) {
        results[property] = await importList(fileName, property);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(70));
    
    let totalUpdated = 0;
    let totalNotFound = 0;
    let totalEmails = 0;
    
    for (const [property, result] of Object.entries(results)) {
      if (result.success) {
        totalUpdated += result.updated;
        totalNotFound += result.notFound;
        totalEmails += result.total;
      }
    }
    
    console.log(`\nTotal emails in CSVs: ${totalEmails.toLocaleString()}`);
    console.log(`Updated in Prospere: ${totalUpdated.toLocaleString()}`);
    console.log(`Not found: ${totalNotFound.toLocaleString()}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('Next steps:');
    console.log('  1. Check counts: node scripts/check-8-list-counts.js');
    console.log('  2. Export CSVs: node scripts/export-8-lists-to-csv.js');
    console.log('  3. Sync to Response Genius: node scripts/sync-8-lists-to-response-genius.js');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
