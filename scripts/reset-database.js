require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');
const Segment = require('../src/models/Segment');
const SyncJob = require('../src/models/SyncJob');

async function resetDatabase() {
  try {
    console.log('🗑️  === RESETTING DATABASE FOR WEBHOOK TEST ===');
    console.log('⚠️  This will delete ALL contacts and segments');
    console.log('🔄 Webhooks will rebuild everything automatically');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Delete all contacts
    console.log('🗑️  Deleting all contacts...');
    const contactsDeleted = await Contact.deleteMany({});
    console.log(`✅ Deleted ${contactsDeleted.deletedCount} contacts`);
    
    // Delete all segments
    console.log('🗑️  Deleting all segments...');
    const segmentsDeleted = await Segment.deleteMany({});
    console.log(`✅ Deleted ${segmentsDeleted.deletedCount} segments`);
    
    // Delete all sync jobs
    console.log('🗑️  Deleting all sync jobs...');
    const syncJobsDeleted = await SyncJob.deleteMany({});
    console.log(`✅ Deleted ${syncJobsDeleted.deletedCount} sync jobs`);
    
    // Create essential dynamic segments for webhook-based filtering
    console.log('📊 Creating webhook-based dynamic segments...');
    
    const db = mongoose.connection.db;
    const segmentsCollection = db.collection('segments');
    
    const dynamicSegments = [
      {
        name: 'All Contacts',
        description: 'All contacts synced via webhooks',
        filters: {},
        createdBy: 'system',
        isSystem: true,
        color: '#007bff',
        icon: 'fas fa-users',
        contactCount: 0,
        lastCountUpdate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'DNC - Do Not Call',
        description: 'Contacts with Do Not Call = Yes from HubSpot workflows',
        filters: {
          dncStatus: 'dnc_internal'
        },
        createdBy: 'system',
        isSystem: true,
        color: '#dc3545',
        icon: 'fas fa-phone-slash',
        contactCount: 0,
        lastCountUpdate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Callable Contacts',
        description: 'Contacts safe to call - excluding DNC',
        filters: {
          $or: [
            { dncStatus: 'callable' },
            { dncStatus: { $exists: false } },
            { dncStatus: null }
          ]
        },
        createdBy: 'system',
        isSystem: true,
        color: '#28a745',
        icon: 'fas fa-phone',
        contactCount: 0,
        lastCountUpdate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Buyers',
        description: 'Contacts with Contact Type = Buyer',
        filters: {
          'customFields.contactType': 'Buyer'
        },
        createdBy: 'system',
        isSystem: true,
        color: '#6f42c1',
        icon: 'fas fa-shopping-cart',
        contactCount: 0,
        lastCountUpdate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Sellers',
        description: 'Contacts with Contact Type = Seller',
        filters: {
          'customFields.contactType': 'Seller'
        },
        createdBy: 'system',
        isSystem: true,
        color: '#fd7e14',
        icon: 'fas fa-handshake',
        contactCount: 0,
        lastCountUpdate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await segmentsCollection.insertMany(dynamicSegments);
    console.log(`✅ Created ${dynamicSegments.length} dynamic segments`);
    
    console.log('\n🎉 DATABASE RESET COMPLETE!');
    console.log('📊 Starting with 0 contacts');
    console.log('🔄 Webhooks will now rebuild everything automatically');
    console.log('');
    console.log('🧪 === TEST PROCESS ===');
    console.log('1. Add a contact in HubSpot');
    console.log('2. Watch Railway logs for webhook activity');
    console.log('3. Check ProspereCRM for new contact');
    console.log('4. Add contact to DNC list in HubSpot');
    console.log('5. Verify DNC status updates in real-time');
    console.log('6. Test filtering and segmentation');
    
  } catch (error) {
    console.error('💥 Reset failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run reset
resetDatabase();