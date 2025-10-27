require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

async function main() {
  await mongoose.connect(mongoUri);
  
  console.log('Testing email matching...\n');
  
  // Get first 10 emails from CSV
  const csvEmails = [];
  await new Promise((resolve) => {
    fs.createReadStream('cold-and-dnc-lists/dnc-seller-outreach.csv')
      .pipe(csv())
      .on('data', (row) => {
        const email = row['Email'];
        if (email && csvEmails.length < 10) {
          csvEmails.push(email.trim());
        }
      })
      .on('end', resolve);
  });
  
  console.log('First 10 emails from CSV:');
  csvEmails.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  
  console.log('\nChecking if they exist in Prospere...\n');
  
  for (const email of csvEmails) {
    // Try exact match
    const exact = await Contact.findOne({ email: email });
    // Try lowercase match
    const lower = await Contact.findOne({ email: email.toLowerCase() });
    // Try case-insensitive regex
    const regex = await Contact.findOne({ email: new RegExp(`^${email}$`, 'i') });
    
    console.log(`${email}:`);
    console.log(`  Exact match: ${exact ? '✓' : '✗'}`);
    console.log(`  Lowercase match: ${lower ? '✓' : '✗'}`);
    console.log(`  Case-insensitive: ${regex ? '✓' : '✗'}`);
    
    if (regex) {
      console.log(`  Stored as: "${regex.email}"`);
    }
  }
  
  await mongoose.disconnect();
}

main();
