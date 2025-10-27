require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

const responseGeniusDncService = require('../src/services/responseGeniusDncService');

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function contactToCSVRow(contact) {
  return [
    escapeCSV(contact.email),
    escapeCSV(contact.firstname || ''),
    escapeCSV(contact.lastname || ''),
    escapeCSV(contact.phone || '')
  ].join(',');
}

async function exportListToCSV(listType) {
  console.log(`\nExporting ${listType.toUpperCase()} list...`);
  
  const contacts = await responseGeniusDncService.getContactsForList(listType);
  console.log(`  Found ${contacts.length} contacts`);
  
  const filename = `DNC_${listType}_outreach.csv`;
  const filepath = path.join(process.cwd(), filename);
  
  // Create CSV content
  const header = 'email,firstname,lastname,phone\n';
  const rows = contacts.map(contactToCSVRow).join('\n');
  const csvContent = header + rows;
  
  // Write to file
  fs.writeFileSync(filepath, csvContent, 'utf8');
  console.log(`  ✓ Exported to: ${filename}`);
  
  return {
    listType,
    filename,
    count: contacts.length
  };
}

async function main() {
  try {
    console.log('Exporting DNC Lists to CSV Files\n');
    console.log('='.repeat(60));
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to Prospere CRM');
    
    const results = [];
    
    // Export each list
    for (const listType of ['seller', 'buyer', 'cre', 'exf']) {
      const result = await exportListToCSV(listType);
      results.push(result);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('EXPORT COMPLETE');
    console.log('='.repeat(60));
    console.log('\nFiles created:');
    
    let totalContacts = 0;
    results.forEach(r => {
      console.log(`  ${r.filename} - ${r.count.toLocaleString()} contacts`);
      totalContacts += r.count;
    });
    
    console.log(`\nTotal contacts exported: ${totalContacts.toLocaleString()}`);
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
