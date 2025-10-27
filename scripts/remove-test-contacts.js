const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function removeTestContacts() {
  console.log('Finding and removing HubSpot test contacts...');
  
  try {
    const totalBefore = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`📊 Total contacts before cleanup: ${totalBefore}`);
    
    // Find test contacts by various patterns
    console.log('\n🔍 Searching for test contacts...');
    
    // Pattern 1: First name contains "test" (case insensitive)
    const testByFirstName = await Contact.find({
      source: 'hubspot',
      firstName: { $regex: /test/i }
    }).limit(20);
    
    console.log(`Found ${testByFirstName.length} contacts with "test" in first name (showing first 20):`);
    testByFirstName.forEach(contact => {
      console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
    });
    
    // Pattern 2: Last name contains "test"
    const testByLastName = await Contact.find({
      source: 'hubspot',
      lastName: { $regex: /test/i }
    }).limit(10);
    
    console.log(`\nFound ${testByLastName.length} contacts with "test" in last name:`);
    testByLastName.forEach(contact => {
      console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
    });
    
    // Pattern 3: Email contains "test"
    const testByEmail = await Contact.find({
      source: 'hubspot',
      email: { $regex: /test/i }
    }).limit(10);
    
    console.log(`\nFound ${testByEmail.length} contacts with "test" in email:`);
    testByEmail.forEach(contact => {
      console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
    });
    
    // Pattern 4: HubSpot-related names
    const hubspotNames = await Contact.find({
      source: 'hubspot',
      $or: [
        { firstName: { $regex: /hubspot/i } },
        { lastName: { $regex: /hubspot/i } },
        { email: { $regex: /hubspot/i } },
        { company: { $regex: /hubspot/i } }
      ]
    }).limit(10);
    
    console.log(`\nFound ${hubspotNames.length} contacts with "hubspot" in name/email/company:`);
    hubspotNames.forEach(contact => {
      console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email}) - ${contact.company} - ID: ${contact.sourceId}`);
    });
    
    // Pattern 5: Other common test patterns
    const otherTestPatterns = await Contact.find({
      source: 'hubspot',
      $or: [
        { firstName: { $regex: /^(demo|sample|example|fake|dummy)$/i } },
        { lastName: { $regex: /^(demo|sample|example|fake|dummy)$/i } },
        { email: { $regex: /(demo|sample|example|fake|dummy|noreply|no-reply)/i } },
        { firstName: { $regex: /^test\d*$/i } }, // test, test1, test2, etc.
        { email: { $regex: /^test\d*@/i } }
      ]
    }).limit(10);
    
    console.log(`\nFound ${otherTestPatterns.length} contacts with other test patterns:`);
    otherTestPatterns.forEach(contact => {
      console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
    });
    
    // Get total count of all test contacts
    const allTestContacts = await Contact.countDocuments({
      source: 'hubspot',
      $or: [
        { firstName: { $regex: /test/i } },
        { lastName: { $regex: /test/i } },
        { email: { $regex: /test/i } },
        { firstName: { $regex: /hubspot/i } },
        { lastName: { $regex: /hubspot/i } },
        { email: { $regex: /hubspot/i } },
        { company: { $regex: /hubspot/i } },
        { firstName: { $regex: /^(demo|sample|example|fake|dummy)$/i } },
        { lastName: { $regex: /^(demo|sample|example|fake|dummy)$/i } },
        { email: { $regex: /(demo|sample|example|fake|dummy|noreply|no-reply)/i } },
        { firstName: { $regex: /^test\d*$/i } },
        { email: { $regex: /^test\d*@/i } }
      ]
    });
    
    console.log(`\n📊 Total test contacts found: ${allTestContacts}`);
    
    if (allTestContacts > 0) {
      console.log('\n🗑️ Removing test contacts...');
      
      const deleteResult = await Contact.deleteMany({
        source: 'hubspot',
        $or: [
          { firstName: { $regex: /test/i } },
          { lastName: { $regex: /test/i } },
          { email: { $regex: /test/i } },
          { firstName: { $regex: /hubspot/i } },
          { lastName: { $regex: /hubspot/i } },
          { email: { $regex: /hubspot/i } },
          { company: { $regex: /hubspot/i } },
          { firstName: { $regex: /^(demo|sample|example|fake|dummy)$/i } },
          { lastName: { $regex: /^(demo|sample|example|fake|dummy)$/i } },
          { email: { $regex: /(demo|sample|example|fake|dummy|noreply|no-reply)/i } },
          { firstName: { $regex: /^test\d*$/i } },
          { email: { $regex: /^test\d*@/i } }
        ]
      });
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} test contacts`);
      
      const totalAfter = await Contact.countDocuments({ source: 'hubspot' });
      console.log(`📊 Total contacts after cleanup: ${totalAfter}`);
      console.log(`📊 Contacts removed: ${totalBefore - totalAfter}`);
      
    } else {
      console.log('✅ No test contacts found to remove');
    }
    
    // Let's also check for any suspicious patterns we might have missed
    console.log('\n🔍 Checking for other suspicious patterns...');
    
    // Contacts with very short or suspicious names
    const suspiciousNames = await Contact.find({
      source: 'hubspot',
      $or: [
        { firstName: { $regex: /^[a-z]{1,2}$/i } }, // Very short first names
        { firstName: { $regex: /^(a|b|c|x|y|z)$/i } }, // Single letter names
        { email: { $regex: /^[a-z]{1,3}@/i } }, // Very short email prefixes
        { firstName: 'John', lastName: 'Doe' }, // Generic John Doe
        { firstName: 'Jane', lastName: 'Doe' }, // Generic Jane Doe
      ]
    }).limit(10);
    
    console.log(`Found ${suspiciousNames.length} contacts with suspicious name patterns:`);
    suspiciousNames.forEach(contact => {
      console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email}) - ID: ${contact.sourceId}`);
    });
    
  } catch (error) {
    console.error('Error during test contact cleanup:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the cleanup
removeTestContacts()
  .then(() => {
    console.log('\nTest contact cleanup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });