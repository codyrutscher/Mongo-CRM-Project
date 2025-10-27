require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const apiId = process.env.RESPONSE_GENIUS_API_ID;
const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
const baseUrl = process.env.RESPONSE_GENIUS_API_URL;

// Map CSV files to Response Genius list IDs
const fileMapping = {
  'dnc-seller-outreach.csv': {
    listId: process.env.RESPONSE_GENIUS_DNC_SELLER_LIST_ID,
    name: 'DNC - Seller outreach'
  },
  'dnc-buyer-outreach.csv': {
    listId: process.env.RESPONSE_GENIUS_DNC_BUYER_LIST_ID,
    name: 'DNC - Buyer outreach'
  },
  'dnc-cre-outreach.csv': {
    listId: process.env.RESPONSE_GENIUS_DNC_CRE_LIST_ID,
    name: 'DNC - CRE outreach'
  },
  'dnc-exf-outreach.csv': {
    listId: process.env.RESPONSE_GENIUS_DNC_EXF_LIST_ID,
    name: 'DNC - EXF outreach'
  },
  'hubspot-crm-exports-seller-cold-2025-10-23.csv': {
    listId: process.env.RESPONSE_GENIUS_COLD_SELLER_LIST_ID,
    name: 'Seller Cold Lead'
  },
  'buyer-cold.csv': {
    listId: process.env.RESPONSE_GENIUS_COLD_BUYER_LIST_ID,
    name: 'Buyer Cold Lead'
  },
  'hubspot-crm-exports-cre-cold-2025-10-23.csv': {
    listId: process.env.RESPONSE_GENIUS_COLD_CRE_LIST_ID,
    name: 'CRE Cold Lead'
  },
  'hubspot-crm-exports-exf-cold-2025-10-23.csv': {
    listId: process.env.RESPONSE_GENIUS_COLD_EXF_LIST_ID,
    name: 'EXF Cold Lead'
  }
};

async function makeRequest(endpoint, method = 'GET', data = null) {
  const url = `${baseUrl}${endpoint}`;
  const config = {
    method,
    url,
    params: { api_id: apiId, api_key: apiKey },
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (data) {
    if (method === 'GET') {
      config.params = { ...config.params, ...data };
    } else {
      config.data = data;
    }
  }
  
  const response = await axios(config);
  return response.data;
}

async function readCSVContacts(filePath) {
  return new Promise((resolve, reject) => {
    const contacts = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Extract contact data - include ALL rows, not just ones with email
        const contact = {
          email: (row['Email'] || row['email'] || '').trim(),
          first_name: (row['First Name'] || row['firstname'] || '').trim(),
          last_name: (row['Last Name'] || row['lastname'] || '').trim(),
          phone: (row['Phone Number'] || row['phone'] || '').trim()
        };
        
        // Only require email to be present (Response Genius needs at least email)
        if (contact.email && contact.email.includes('@')) {
          contacts.push(contact);
        }
      })
      .on('end', () => resolve(contacts))
      .on('error', reject);
  });
}

async function uploadList(fileName, config) {
  const filePath = path.join(process.cwd(), 'cold-and-dnc-lists', fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ✗ File not found: ${fileName}`);
    return { success: false, error: 'File not found' };
  }
  
  console.log(`\n${config.name}:`);
  console.log(`  Reading ${fileName}...`);
  
  const contacts = await readCSVContacts(filePath);
  console.log(`  Found ${contacts.length.toLocaleString()} contacts with valid emails`);
  
  if (contacts.length === 0) {
    return { success: false, error: 'No valid contacts found' };
  }
  
  // Upload in batches of 100
  const batchSize = 100;
  let uploaded = 0;
  let errors = 0;
  
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    
    try {
      await makeRequest('/lists/import_optin', 'POST', {
        list_api_identifier: config.listId,
        contacts: batch
      });
      uploaded += batch.length;
      
      if ((i + batchSize) % 1000 === 0) {
        console.log(`    Uploaded ${Math.min(i + batchSize, contacts.length).toLocaleString()}/${contacts.length.toLocaleString()}...`);
      }
    } catch (error) {
      errors++;
      console.error(`    Error uploading batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      if (error.response?.data) {
        console.error(`    Response:`, JSON.stringify(error.response.data).substring(0, 200));
      }
    }
    
    // Rate limiting - small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`  ✓ Uploaded: ${uploaded.toLocaleString()} contacts`);
  if (errors > 0) {
    console.log(`  ⚠ Errors: ${errors} batches failed`);
  }
  
  return { success: true, uploaded, errors, total: contacts.length };
}

async function main() {
  try {
    console.log('Uploading CSV Files to Response Genius\n');
    console.log('='.repeat(70));
    console.log('API URL:', baseUrl);
    console.log('API ID:', apiId ? '✓ Set' : '✗ Missing');
    console.log('API Key:', apiKey ? '✓ Set' : '✗ Missing');
    
    const results = {};
    
    console.log('\nDNC LISTS:');
    console.log('-'.repeat(70));
    for (const [fileName, config] of Object.entries(fileMapping)) {
      if (config.name.startsWith('DNC')) {
        results[config.name] = await uploadList(fileName, config);
      }
    }
    
    console.log('\nCOLD LEAD LISTS:');
    console.log('-'.repeat(70));
    for (const [fileName, config] of Object.entries(fileMapping)) {
      if (!config.name.startsWith('DNC')) {
        results[config.name] = await uploadList(fileName, config);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('UPLOAD COMPLETE');
    console.log('='.repeat(70));
    
    let totalUploaded = 0;
    let totalErrors = 0;
    let totalContacts = 0;
    
    for (const [listName, result] of Object.entries(results)) {
      if (result.success) {
        totalUploaded += result.uploaded;
        totalErrors += result.errors || 0;
        totalContacts += result.total;
      }
    }
    
    console.log(`\nTotal contacts in CSVs: ${totalContacts.toLocaleString()}`);
    console.log(`Successfully uploaded: ${totalUploaded.toLocaleString()}`);
    console.log(`Failed batches: ${totalErrors}`);
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
