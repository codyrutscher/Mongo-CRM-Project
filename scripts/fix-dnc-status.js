require('dotenv').config();
const mongoose = require('mongoose');

async function fixDNCStatus() {
  try {
    console.log('🔧 === FIXING DNC STATUS ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    // Get all contacts with hubspotDoNotCall field
    const contacts = await contactsCollection.find({
      source: 'hubspot',
      'customFields.hubspotDoNotCall': { $exists: true }
    }).toArray();
    
    console.log(`📊 Found ${contacts.length} HubSpot contacts to check`);
    
    let updated = 0;
    let dncFixed = 0;
    let callableFixed = 0;
    
    for (const contact of contacts) {
      const hubspotDoNotCall = contact.customFields?.hubspotDoNotCall;
      let newDncStatus = null;
      let shouldUpdate = false;
      
      // Apply the same logic as hubspotService.mapDncStatus()
      if (hubspotDoNotCall === 'true' || hubspotDoNotCall === true || 
          hubspotDoNotCall === 'True' || hubspotDoNotCall === 'YES' || 
          hubspotDoNotCall === 'Yes' || hubspotDoNotCall === '1') {
        
        newDncStatus = 'dnc_internal';
        if (contact.dncStatus !== 'dnc_internal') {
          shouldUpdate = true;
          dncFixed++;
        }
        
      } else if (hubspotDoNotCall === 'false' || hubspotDoNotCall === false || 
                 hubspotDoNotCall === 'False' || hubspotDoNotCall === 'NO' || 
                 hubspotDoNotCall === 'No' || hubspotDoNotCall === '0' || 
                 hubspotDoNotCall === '') {
        
        newDncStatus = 'callable';
        if (contact.dncStatus !== 'callable') {
          shouldUpdate = true;
          callableFixed++;
        }
      }
      
      if (shouldUpdate && newDncStatus) {
        await contactsCollection.updateOne(
          { _id: contact._id },
          { 
            $set: { 
              dncStatus: newDncStatus,
              dncDate: newDncStatus === 'dnc_internal' ? new Date() : null,
              dncReason: newDncStatus === 'dnc_internal' ? 'Fixed from HubSpot Do Not Call property' : null,
              lastSyncedAt: new Date()
            }
          }
        );
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated} contacts`);
    console.log(`  - Fixed to DNC: ${dncFixed}`);
    console.log(`  - Fixed to Callable: ${callableFixed}`);
    
    // Get new counts
    const newDncCount = await contactsCollection.countDocuments({ 
      source: 'hubspot', 
      dncStatus: 'dnc_internal' 
    });
    const newCallableCount = await contactsCollection.countDocuments({ 
      source: 'hubspot', 
      dncStatus: 'callable' 
    });
    
    console.log(`\n📊 NEW COUNTS:`);
    console.log(`🚫 DNC Contacts: ${newDncCount}`);
    console.log(`✅ Callable Contacts: ${newCallableCount}`);
    console.log(`📊 Total: ${newDncCount + newCallableCount}`);
    
    // Update segment counts
    const segmentsCollection = db.collection('segments');
    
    await segmentsCollection.updateOne(
      { $or: [{ name: 'DNC - Do Not Call' }, { name: 'DNC - Do Not Call (Dynamic)' }] },
      { $set: { contactCount: newDncCount, lastCountUpdate: new Date() } }
    );
    
    await segmentsCollection.updateOne(
      { $or: [{ name: 'Callable Contacts' }, { name: 'Callable Contacts (Dynamic)' }] },
      { $set: { contactCount: newCallableCount, lastCountUpdate: new Date() } }
    );
    
    console.log('✅ Updated segment counts');
    
  } catch (error) {
    console.error('💥 Fix failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run fix
fixDNCStatus();