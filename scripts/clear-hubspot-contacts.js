require('dotenv').config();
const mongoose = require('mongoose');

async function clearHubSpotContacts() {
  try {
    console.log('🗑️  === CLEARING ALL HUBSPOT CONTACTS ===');
    console.log('⚠️  This will delete ALL HubSpot contacts from the database');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    // Count current HubSpot contacts
    const hubspotCount = await contactsCollection.countDocuments({ source: 'hubspot' });
    const totalCount = await contactsCollection.countDocuments();
    
    console.log(`\n📊 CURRENT DATABASE STATE:`);
    console.log(`📋 Total contacts: ${totalCount}`);
    console.log(`🔗 HubSpot contacts: ${hubspotCount}`);
    console.log(`📊 Other sources: ${totalCount - hubspotCount}`);
    
    if (hubspotCount === 0) {
      console.log('✅ No HubSpot contacts to delete');
      return;
    }
    
    console.log(`\n🗑️  Deleting ${hubspotCount} HubSpot contacts...`);
    
    // Delete all HubSpot contacts
    const deleteResult = await contactsCollection.deleteMany({ source: 'hubspot' });
    
    console.log(`✅ Deleted ${deleteResult.deletedCount} HubSpot contacts`);
    
    // Verify deletion
    const remainingHubSpot = await contactsCollection.countDocuments({ source: 'hubspot' });
    const newTotal = await contactsCollection.countDocuments();
    
    console.log(`\n📊 AFTER CLEANUP:`);
    console.log(`📋 Total contacts: ${newTotal}`);
    console.log(`🔗 HubSpot contacts: ${remainingHubSpot}`);
    console.log(`📊 Other sources: ${newTotal}`);
    
    if (remainingHubSpot === 0) {
      console.log('🎉 Successfully cleared all HubSpot contacts!');
      console.log('✅ Ready for fresh HubSpot sync');
    } else {
      console.log(`⚠️  ${remainingHubSpot} HubSpot contacts still remain`);
    }
    
    // Update segment counts to reflect the cleanup
    const segmentsCollection = db.collection('segments');
    
    await segmentsCollection.updateMany(
      {},
      { 
        $set: { 
          contactCount: 0, 
          lastCountUpdate: new Date() 
        }
      }
    );
    
    console.log('✅ Reset all segment counts to 0');
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

clearHubSpotContacts();