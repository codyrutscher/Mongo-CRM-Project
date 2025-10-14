const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function findAndFixDuplicates() {
  console.log('Finding and fixing duplicate contacts...');
  
  try {
    // First, let's see what we have
    const totalContacts = await Contact.countDocuments({ source: 'hubspot' });
    console.log(`📊 Current total HubSpot contacts in DB: ${totalContacts}`);
    console.log(`📊 Expected total from HubSpot: 135,958`);
    console.log(`📊 Excess contacts: ${totalContacts - 135958}`);
    
    // Find duplicates by sourceId (HubSpot ID)
    console.log('\n🔍 Finding duplicates by HubSpot ID...');
    const duplicatesBySourceId = await Contact.aggregate([
      { $match: { source: 'hubspot' } },
      { $group: { 
          _id: '$sourceId', 
          count: { $sum: 1 },
          docs: { $push: { id: '$_id', createdAt: '$createdAt', email: '$email' } }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log(`Found ${duplicatesBySourceId.length} HubSpot IDs with duplicates`);
    
    let totalDuplicateContacts = 0;
    let contactsToDelete = [];
    
    for (const duplicate of duplicatesBySourceId) {
      const duplicateCount = duplicate.count - 1; // Keep one, delete the rest
      totalDuplicateContacts += duplicateCount;
      
      // Sort by createdAt and keep the oldest one
      duplicate.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // Mark all but the first one for deletion
      for (let i = 1; i < duplicate.docs.length; i++) {
        contactsToDelete.push(duplicate.docs[i].id);
      }
      
      if (duplicatesBySourceId.indexOf(duplicate) < 10) { // Show first 10
        console.log(`  HubSpot ID ${duplicate._id}: ${duplicate.count} copies (keeping oldest, deleting ${duplicateCount})`);
      }
    }
    
    console.log(`\n📊 Duplicate Summary:`);
    console.log(`Total duplicate contacts to remove: ${totalDuplicateContacts}`);
    console.log(`After cleanup, we should have: ${totalContacts - totalDuplicateContacts} contacts`);
    
    // Also check for email duplicates (different approach)
    console.log('\n🔍 Checking for email duplicates...');
    const emailDuplicates = await Contact.aggregate([
      { 
        $match: { 
          source: 'hubspot',
          email: { $ne: '', $exists: true }
        }
      },
      { $group: { 
          _id: '$email', 
          count: { $sum: 1 },
          sourceIds: { $addToSet: '$sourceId' }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    console.log(`Found ${emailDuplicates.length} emails with multiple contacts (showing top 10):`);
    emailDuplicates.forEach(dup => {
      console.log(`  ${dup._id}: ${dup.count} contacts, HubSpot IDs: ${dup.sourceIds.join(', ')}`);
    });
    
    // Now let's clean up the duplicates
    if (contactsToDelete.length > 0) {
      console.log(`\n🧹 Removing ${contactsToDelete.length} duplicate contacts...`);
      
      const deleteResult = await Contact.deleteMany({
        _id: { $in: contactsToDelete }
      });
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} duplicate contacts`);
      
      // Verify the cleanup
      const finalCount = await Contact.countDocuments({ source: 'hubspot' });
      console.log(`📊 Final count after cleanup: ${finalCount}`);
      console.log(`📊 Expected: 135,958`);
      console.log(`📊 Difference: ${finalCount - 135958}`);
      
      if (finalCount === 135958) {
        console.log('🎉 Perfect! We now have exactly the right number of contacts!');
      } else if (finalCount < 135958) {
        console.log(`⚠️ We're missing ${135958 - finalCount} contacts`);
      } else {
        console.log(`⚠️ We still have ${finalCount - 135958} extra contacts`);
      }
    }
    
    // Let's also check for any remaining issues
    console.log('\n🔍 Final verification...');
    
    // Check for any remaining sourceId duplicates
    const remainingDuplicates = await Contact.aggregate([
      { $match: { source: 'hubspot' } },
      { $group: { _id: '$sourceId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    console.log(`Remaining sourceId duplicates: ${remainingDuplicates.length}`);
    
    // Check for contacts without sourceId
    const withoutSourceId = await Contact.countDocuments({ 
      source: 'hubspot',
      $or: [
        { sourceId: { $exists: false } },
        { sourceId: '' },
        { sourceId: null }
      ]
    });
    
    console.log(`Contacts without sourceId: ${withoutSourceId}`);
    
  } catch (error) {
    console.error('Error during duplicate cleanup:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the cleanup
findAndFixDuplicates()
  .then(() => {
    console.log('\nDuplicate cleanup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });