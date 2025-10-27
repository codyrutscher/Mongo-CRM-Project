require('dotenv').config();
const mongoose = require('mongoose');

async function cleanupDuplicates() {
  try {
    console.log('🧹 === CLEANING UP DUPLICATE CONTACTS ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    // Find duplicates by HubSpot sourceId (most reliable)
    console.log('🔍 Finding HubSpot ID duplicates...');
    const hubspotIdDuplicates = await contactsCollection.aggregate([
      { $match: { sourceId: { $ne: null, $ne: '' }, source: 'hubspot' } },
      { $group: { 
          _id: '$sourceId', 
          count: { $sum: 1 }, 
          contacts: { $push: { id: '$_id', createdAt: '$createdAt', lastSyncedAt: '$lastSyncedAt' } }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log(`📊 Found ${hubspotIdDuplicates.length} sets of HubSpot ID duplicates`);
    
    let deletedCount = 0;
    
    for (const duplicate of hubspotIdDuplicates) {
      const contacts = duplicate.contacts;
      
      // Sort by lastSyncedAt (most recent first), then by createdAt (oldest first as tiebreaker)
      contacts.sort((a, b) => {
        if (a.lastSyncedAt && b.lastSyncedAt) {
          return new Date(b.lastSyncedAt) - new Date(a.lastSyncedAt);
        }
        if (a.lastSyncedAt && !b.lastSyncedAt) return -1;
        if (!a.lastSyncedAt && b.lastSyncedAt) return 1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      
      // Keep the first (most recently synced or oldest) contact, delete the rest
      const toKeep = contacts[0];
      const toDelete = contacts.slice(1);
      
      console.log(`🗑️  HubSpot ID ${duplicate._id}: Keeping 1, deleting ${toDelete.length}`);
      
      for (const contact of toDelete) {
        await contactsCollection.deleteOne({ _id: contact.id });
        deletedCount++;
      }
    }
    
    // Find duplicates by email (for contacts that might not have sourceId duplicates)
    console.log('\n🔍 Finding email duplicates...');
    const emailDuplicates = await contactsCollection.aggregate([
      { $match: { email: { $ne: null, $ne: '' }, source: 'hubspot' } },
      { $group: { 
          _id: '$email', 
          count: { $sum: 1 }, 
          contacts: { $push: { 
            id: '$_id', 
            sourceId: '$sourceId',
            createdAt: '$createdAt', 
            lastSyncedAt: '$lastSyncedAt' 
          }}
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log(`📧 Found ${emailDuplicates.length} sets of email duplicates`);
    
    for (const duplicate of emailDuplicates) {
      const contacts = duplicate.contacts;
      
      // Check if these are different HubSpot contacts (different sourceId)
      const uniqueSourceIds = [...new Set(contacts.map(c => c.sourceId))];
      
      if (uniqueSourceIds.length === contacts.length) {
        // These are different HubSpot contacts with same email - keep all
        console.log(`📧 Email ${duplicate._id}: Different HubSpot contacts, keeping all`);
        continue;
      }
      
      // These are true duplicates - same email, likely same or missing sourceId
      contacts.sort((a, b) => {
        if (a.lastSyncedAt && b.lastSyncedAt) {
          return new Date(b.lastSyncedAt) - new Date(a.lastSyncedAt);
        }
        if (a.lastSyncedAt && !b.lastSyncedAt) return -1;
        if (!a.lastSyncedAt && b.lastSyncedAt) return 1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      
      const toKeep = contacts[0];
      const toDelete = contacts.slice(1);
      
      console.log(`📧 Email ${duplicate._id}: Keeping 1, deleting ${toDelete.length}`);
      
      for (const contact of toDelete) {
        await contactsCollection.deleteOne({ _id: contact.id });
        deletedCount++;
      }
    }
    
    console.log(`\n✅ Cleanup completed: Deleted ${deletedCount} duplicate contacts`);
    
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
    
    console.log(`\n📊 FINAL COUNTS:`);
    console.log(`📋 Total Contacts: ${finalCount}`);
    console.log(`🚫 DNC Contacts: ${dncCount}`);
    console.log(`✅ Callable Contacts: ${callableCount}`);
    
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
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run cleanup
cleanupDuplicates();