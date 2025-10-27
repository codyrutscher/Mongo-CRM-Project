require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

const mongoUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' });
const Contact = mongoose.model('Contact', contactSchema);

async function importCSVWithCampaignStatus(csvPath) {
  console.log('Importing CSV with Campaign Status...\n');
  console.log('='.repeat(70));
  
  const contacts = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        // Expected columns: email, campaignStatus, campaignType
        if (row.email || row.Email) {
          contacts.push({
            email: (row.email || row.Email).trim().toLowerCase(),
            campaignStatus: row.campaignStatus || row['Campaign Status'] || '',
            campaignType: row.campaignType || row['Campaign Type'] || ''
          });
        }
      })
      .on('end', async () => {
        console.log(`Found ${contacts.length} contacts in CSV\n`);
        
        let updated = 0;
        let notFound = 0;
        
        for (const contact of contacts) {
          try {
            const result = await Contact.updateOne(
              { email: contact.email },
              { 
                $set: { 
                  campaignStatus: contact.campaignStatus,
                  campaignType: contact.campaignType
                } 
              }
            );
            
            if (result.modifiedCount > 0) {
              updated++;
            } else {
              notFound++;
            }
          } catch (error) {
            console.error(`Error updating ${contact.email}:`, error.message);
          }
        }
        
        console.log('='.repeat(70));
        console.log('IMPORT COMPLETE');
        console.log('='.repeat(70));
        console.log(`Total in CSV: ${contacts.length}`);
        console.log(`Updated: ${updated}`);
        console.log(`Not found: ${notFound}`);
        
        resolve({ updated, notFound, total: contacts.length });
      })
      .on('error', reject);
  });
}

async function main() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to Prospere CRM\n');
    
    // Example: Create a test CSV
    const testCSV = 'email,campaignStatus,campaignType\ntest@example.com,Delivered,Buyer\n';
    fs.writeFileSync('test-campaign-status.csv', testCSV);
    console.log('Created test CSV: test-campaign-status.csv\n');
    console.log('CSV Format:');
    console.log('  - email: Contact email address');
    console.log('  - campaignStatus: Delivered, Unsubscribed, Hard Bounce, or Soft Bounce');
    console.log('  - campaignType: Buyer, Seller, CRE, or Exit Factor\n');
    
    console.log('To import your CSV, run:');
    console.log('  node scripts/test-csv-upload-with-campaign-status.js your-file.csv\n');
    
    // If a file path is provided, import it
    if (process.argv[2]) {
      await importCSVWithCampaignStatus(process.argv[2]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
