require('dotenv').config();
const mongoose = require('mongoose');

async function finalDuplicateCleanup() {
  try {
    console.log('🧹 === FINAL DUPLICATE CLEANUP ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    let totalDeleted = 0;
    
    // 1. Clean up exact HubSpot ID duplicates (these are true duplicates)
    console.log('\n🔍 Phase 1: Cleaning HubSpot ID duplicates...');
    const sourceIdDuplicates = await contactsCollection.aggregate([
      { $match: { sourceId: { $ne: null, $ne: '' } } },
      { $group: { 
          _id: '$sourceId', 
          count: { $sum: 1 },
          contacts: { $push: { 
            id: '$_id', 
            createdAt: '$createdAt',
            lastSyncedAt: '$lastSyncedAt'
          }}
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    console.log(`📊 Found ${sourceIdDuplicates.length} sets of HubSpot ID duplicates`);
    
    for (const duplicate of sourceIdDuplicates) {
      const contacts = duplicate.contacts;
      
      // Sort by lastSyncedAt (most recent first), then by createdAt (oldest first)
      contacts.sort((a, b) => {
        if (a.lastSyncedAt && b.lastSyncedAt) {
          return new Date(b.lastSyncedAt) - new Date(a.lastSyncedAt);
        }
        if (a.lastSyncedAt && !b.lastSyncedAt) return -1;
        if (!a.lastSyncedAt && b.lastSyncedAt) return 1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      
      // Keep the most recently synced contact, delete the rest
      const toKeep = contacts[0];
      const toDelete = contacts.slice(1);
      
      console.log(`🗑️  HubSpot ID ${duplicate._id}: Keeping 1, deleting ${toDelete.length}`);
      
      for (const contact of toDelete) {
        await contactsCollection.deleteOne({ _id: contact.id });
        totalDeleted++;
      }
    }
    
    // 2. Handle email duplicates more carefully
    console.log('\n🔍 Phase 2: Analyzing email duplicates...');
    const emailDuplicates = await contactsCollection.aggregate([
      { $match: { email: { $ne: null, $ne: '' } } },
      { $group: { 
          _id: '$email', 
          count: { $sum: 1 },
          contacts: { $push: { 
            id: '$_id', 
            sourceId: '$sourceId',
            firstName: '$firstName',
            lastName: '$lastName',
            createdAt: '$createdAt',
            lastSyncedAt: '$lastSyncedAt'
          }}
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    console.log(`📧 Found ${emailDuplicates.length} sets of email duplicates`);
    
    for (const duplicate of emailDuplicates) {
      const contacts = duplicate.contacts;
      const uniqueSourceIds = [...new Set(contacts.map(c => c.sourceId))];
      
      if (uniqueSourceIds.length === contacts.length) {
        // These are different HubSpot contacts with same email - this is valid
        console.log(`📧 Email ${duplicate._id}: Different HubSpot contacts (${uniqueSourceIds.length}), keeping all`);
        continue;
      }
      
      // Group by sourceId to handle duplicates within each sourceId
      const contactsBySourceId = {};
      contacts.forEach(contact => {
        if (!contactsBySourceId[contact.sourceId]) {
          contactsBySourceId[contact.sourceId] = [];
        }
        contactsBySourceId[contact.sourceId].push(contact);
      });
      
      // For each sourceId group, keep only the most recent
      for (const [sourceId, sourceContacts] of Object.entries(contactsBySourceId)) {
        if (sourceContacts.length > 1) {
          // Sort by lastSyncedAt, then createdAt
          sourceContacts.sort((a, b) => {
            if (a.lastSyncedAt && b.lastSyncedAt) {
              return new Date(b.lastSyncedAt) - new Date(a.lastSyncedAt);
            }
            if (a.lastSyncedAt && !b.lastSyncedAt) return -1;
            if (!a.lastSyncedAt && b.lastSyncedAt) return 1;
            return new Date(a.createdAt) - new Date(b.createdAt);
          });
          
          const toKeep = sourceContacts[0];
          const toDelete = sourceContacts.slice(1);
          
          console.log(`📧 Email ${duplicate._id}, HubSpot ID ${sourceId}: Keeping 1, deleting ${toDelete.length}`);
          
          for (const contact of toDelete) {
            await contactsCollection.deleteOne({ _id: contact.id });
            totalDeleted++;
          }
        }
      }
    }
    
    console.log(`\n✅ Final cleanup completed: Deleted ${totalDeleted} duplicate contacts`);
    
    // Get final counts
    const finalCount = await contactsCollection.countDocuments();
    const dncCount = await contactsCollection.countDocuments({ dncStatus: 'dnc_internal' });
    const callableCount = await contactsCollection.countDocuments({ 
      $or: [
        { dncStatus: 'callable' },
        { dncStatus: { $exists: false } },
        { dncStatus: null }
      ]
    });
    
    console.log(`\n📊 FINAL COUNTS AFTER CLEANUP:`);
    console.log(`📋 Total Contacts: ${finalCount}`);
    console.log(`🚫 DNC Contacts: ${dncCount}`);
    console.log(`✅ Callable Contacts: ${callableCount}`);
    
    console.log(`\n📊 COMPARISON TO HUBSPOT:`);
    console.log(`📋 HubSpot Total: 135,815`);
    console.log(`📋 Prospere Total: ${finalCount}`);
    console.log(`📊 Difference: ${finalCount - 135815} (should be close to 0)`);
    
    // Update segment counts
    const segmentsCollection = db.collection('segments');
    
    await segmentsCollection.updateOne(
      { $or: [{ name: 'DNC - Do Not Call' }, { name: 'DNC - Do Not Call (Dynamic)' }] },
      { $set: { contactCount: dncCount, lastCountUpdate: new Date() } }
    );
    
    await segmentsCollection.updateOne(
      { $or: [{ name: 'Callable Contacts' }, { name: 'Callable Contacts (Dynamic)' }] },
      { $set: { contactCount: callableCount, lastCountUpdate: new Date() } }
    );
    
    console.log('✅ Updated segment counts');
    
    // Verify no duplicates remain
    const remainingSourceIdDuplicates = await contactsCollection.aggregate([
      { $match: { sourceId: { $ne: null, $ne: '' } } },
      { $group: { _id: '$sourceId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    console.log(`\n🔍 Remaining HubSpot ID duplicates: ${remainingSourceIdDuplicates.length}`);
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run cleanup
finalDuplicateCleanup();