require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

const responseGenius8ListsService = require('../src/services/responseGenius8ListsService');

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

async function exportListToCSV(listKey, config) {
  console.log(`\n${config.name}...`);
  
  const contacts = await responseGenius8ListsService.getContactsForList(listKey);
  console.log(`  Found: ${contacts.length.toLocaleString()} contacts`);
  
  if (contacts.length === 0) {
    console.log(`  Skipped: No contacts to export`);
    return null;
  }
  
  const filename = `${config.listId}.csv`;
  const filepath = path.join(process.cwd(), filename);
  
  const header = 'email,firstname,lastname,phone\n';
  const rows = contacts.map(contactToCSVRow).join('\n');
  const csvContent = header + rows;
  
  fs.writeFileSync(filepath, csvContent, 'utf8');
  console.log(`  ✓ Exported: ${filename}`);
  
  return {
    listKey,
    filename,
    count: contacts.length,
    name: config.name
  };
}

async function main() {
  try {
    console.log('Exporting 8 Response Genius Lists to CSV\n');
    console.log('='.repeat(70));
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to Prospere CRM');
    
    const results = [];
    
    console.log('\nDNC LISTS:');
    console.log('-'.repeat(70));
    for (const listKey of ['dnc_seller', 'dnc_buyer', 'dnc_cre', 'dnc_exf']) {
      const result = await exportListToCSV(listKey, responseGenius8ListsService.lists[listKey]);
      if (result) results.push(result);
    }
    
    console.log('\nCOLD LEAD LISTS:');
    console.log('-'.repeat(70));
    for (const listKey of ['cold_seller', 'cold_buyer', 'cold_cre', 'cold_exf']) {
      const result = await exportListToCSV(listKey, responseGenius8ListsService.lists[listKey]);
      if (result) results.push(result);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('EXPORT COMPLETE');
    console.log('='.repeat(70));
    console.log('\nFiles created:');
    
    let totalContacts = 0;
    results.forEach(r => {
      console.log(`  ${r.filename.padEnd(30)} ${r.count.toLocaleString().padStart(8)} contacts - ${r.name}`);
      totalContacts += r.count;
    });
    
    console.log(`\nTotal: ${totalContacts.toLocaleString()} contacts across ${results.length} files`);
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
