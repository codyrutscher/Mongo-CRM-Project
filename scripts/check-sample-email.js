require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

async function main() {
  await mongoose.connect(mongoUri);
  
  const testEmail = 'joanna@edenbeacon.com';
  const contact = await Contact.findOne({ email: testEmail });
  
  if (contact) {
    console.log('✓ Contact found:', testEmail);
    console.log('  Source:', contact.source);
    console.log('  SourceId:', contact.sourceId);
    console.log('  Email:', contact.email);
  } else {
    console.log('✗ Contact NOT found:', testEmail);
    
    // Check total contacts
    const total = await Contact.countDocuments();
    console.log(`\nTotal contacts in Prospere: ${total.toLocaleString()}`);
    
    // Sample a few emails
    const samples = await Contact.find().limit(5).select('email source');
    console.log('\nSample emails in Prospere:');
    samples.forEach(s => console.log(`  ${s.email} (${s.source})`));
  }
  
  await mongoose.disconnect();
}

main();
