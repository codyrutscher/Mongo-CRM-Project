require('dotenv').config();
const axios = require('axios');

async function findProblematicContacts() {
  console.log('🔍 === FINDING PROBLEMATIC CONTACTS ===');
  
  const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
  const headers = {
    'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  const allProperties = 'firstname,lastname,jobtitle,linkedin_profile_url,email,phone,website,business_category___industry_of_interest,naics_code,numemployees,year_established,office_phone,address,city,state,zip,lead_source,contact_type,hs_email_last_send_date,createdate,lastmodifieddate,lifecyclestage,annualrevenue,industry,account_type,broker,buyer_status,seller_status,currently_own_a_business,legal_organization_type,primary_investor_type,buying_role,motivation_for_buying,dnc_flag,optout,compliance_notes';
  
  let after = null;
  let pageCount = 0;
  let totalFetched = 0;
  let problematicRanges = [];
  
  console.log('🔍 Scanning through contacts to find problematic ones...');
  
  while (pageCount < 2000) { // Scan through a reasonable number of pages
    try {
      console.log(`📄 Testing page ${pageCount + 1} (after: ${after || 'start'})...`);
      
      const response = await axios.get(baseURL, {
        headers,
        params: {
          properties: allProperties,
          limit: 100,
          ...(after && { after })
        }
      });
      
      if (response.data.results && response.data.results.length > 0) {
        totalFetched += response.data.results.length;
        pageCount++;
        
        // Check if there's more data
        if (response.data.paging && response.data.paging.next) {
          after = response.data.paging.next.after;
        } else {
          console.log('✅ Reached end of contacts - no problematic contacts found!');
          break;
        }
        
        // Progress update
        if (pageCount % 50 === 0) {
          console.log(`📊 Scanned ${totalFetched} contacts so far...`);
        }
        
      } else {
        console.log('⚠️  Empty response, stopping scan');
        break;
      }
      
    } catch (error) {
      console.log(`❌ ERROR at page ${pageCount + 1} (after: ${after})`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Message: ${error.message}`);
      
      // Record the problematic range
      problematicRanges.push({
        pageNumber: pageCount + 1,
        afterToken: after,
        totalContactsBeforeError: totalFetched
      });
      
      console.log('🔍 Found problematic range! Now narrowing down...');
      
      // Try to narrow down the exact problematic contact
      await narrowDownProblematicContact(after, headers, allProperties);
      
      // Try to skip past this problematic contact
      const skipResult = await skipProblematicContact(after, headers, allProperties);
      if (skipResult.success) {
        after = skipResult.newAfter;
        console.log(`✅ Successfully skipped problematic contact, continuing from: ${after}`);
      } else {
        console.log('❌ Could not skip problematic contact, stopping scan');
        break;
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('\n📊 SCAN RESULTS:');
  console.log(`📋 Total contacts scanned: ${totalFetched}`);
  console.log(`🚨 Problematic ranges found: ${problematicRanges.length}`);
  
  if (problematicRanges.length > 0) {
    console.log('\n🚨 PROBLEMATIC RANGES:');
    problematicRanges.forEach((range, i) => {
      console.log(`  ${i + 1}. Page ${range.pageNumber}, after token: ${range.afterToken}`);
      console.log(`     Contacts before error: ${range.totalContactsBeforeError}`);
    });
    
    console.log('\n💡 SOLUTION STRATEGY:');
    console.log('1. Sync all contacts before the first problematic range');
    console.log('2. Handle problematic contacts individually with error handling');
    console.log('3. Continue syncing after each problematic range');
  } else {
    console.log('✅ No problematic contacts found in the scanned range!');
    console.log('💡 The 500 errors might be intermittent or rate-limit related');
  }
}

async function narrowDownProblematicContact(afterToken, headers, properties) {
  console.log('🎯 Narrowing down the exact problematic contact...');
  
  const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
  
  // Try smaller batch sizes to isolate the problematic contact
  const batchSizes = [50, 25, 10, 5, 1];
  
  for (const batchSize of batchSizes) {
    try {
      console.log(`   Trying batch size: ${batchSize}`);
      
      const response = await axios.get(baseURL, {
        headers,
        params: {
          properties: properties,
          limit: batchSize,
          ...(afterToken && { after: afterToken })
        }
      });
      
      console.log(`   ✅ Batch size ${batchSize} works`);
      
      if (batchSize === 1 && response.data.results.length > 0) {
        const contact = response.data.results[0];
        console.log(`   🎯 FOUND PROBLEMATIC CONTACT:`);
        console.log(`      ID: ${contact.id}`);
        console.log(`      Name: ${contact.properties.firstname} ${contact.properties.lastname}`);
        console.log(`      Email: ${contact.properties.email}`);
        
        // Check which properties might be problematic
        console.log(`   🔍 Checking contact properties...`);
        for (const [key, value] of Object.entries(contact.properties)) {
          if (value && (value.length > 1000 || value.includes('\n') || value.includes('\r'))) {
            console.log(`      ⚠️  Suspicious property ${key}: ${value.substring(0, 100)}...`);
          }
        }
      }
      
      break;
      
    } catch (error) {
      console.log(`   ❌ Batch size ${batchSize} failed: ${error.response?.status}`);
      
      if (batchSize === 1) {
        console.log('   🚨 Even single contact fails - this contact is definitely problematic');
      }
    }
  }
}

async function skipProblematicContact(afterToken, headers, properties) {
  console.log('⏭️  Attempting to skip past problematic contact...');
  
  const baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
  
  // Try to get just the contact IDs to skip past the problematic one
  try {
    const response = await axios.get(baseURL, {
      headers,
      params: {
        properties: 'firstname', // Minimal property
        limit: 10,
        ...(afterToken && { after: afterToken })
      }
    });
    
    if (response.data.results && response.data.results.length > 0) {
      // Use the last contact ID as the new 'after' token
      const lastContact = response.data.results[response.data.results.length - 1];
      console.log(`   ✅ Successfully skipped, new after token: ${lastContact.id}`);
      
      return {
        success: true,
        newAfter: lastContact.id
      };
    }
    
  } catch (error) {
    console.log(`   ❌ Skip attempt failed: ${error.response?.status}`);
  }
  
  return { success: false };
}

findProblematicContacts();