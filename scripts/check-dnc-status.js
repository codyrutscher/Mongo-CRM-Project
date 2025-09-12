require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

async function checkDNCStatus() {
  try {
    console.log('🔍 === CHECKING DNC STATUS DISTRIBUTION ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get DNC status breakdown
    const dncBreakdown = await Contact.aggregate([
      {
        $group: {
          _id: '$dncStatus',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 === DNC STATUS BREAKDOWN ===');
    let totalChecked = 0;
    dncBreakdown.forEach(status => {
      console.log(`${status._id || 'null/undefined'}: ${status.count} contacts`);
      totalChecked += status.count;
    });
    console.log(`Total checked: ${totalChecked}`);
    
    // Specific counts
    const dncInternal = await Contact.countDocuments({ dncStatus: 'dnc_internal' });
    const callable = await Contact.countDocuments({ dncStatus: 'callable' });
    const nullDnc = await Contact.countDocuments({ 
      $or: [
        { dncStatus: null },
        { dncStatus: { $exists: false } }
      ]
    });
    
    console.log('\n📋 === SPECIFIC COUNTS ===');
    console.log(`🚫 DNC Internal: ${dncInternal}`);
    console.log(`✅ Callable: ${callable}`);
    console.log(`❓ Null/Undefined: ${nullDnc}`);
    console.log(`📊 Total: ${dncInternal + callable + nullDnc}`);
    
    // Check what should be callable
    console.log('\n💡 === CALLABLE CALCULATION ===');
    const totalContacts = await Contact.countDocuments();
    const shouldBeCallable = totalContacts - dncInternal;
    console.log(`📈 Total contacts: ${totalContacts}`);
    console.log(`🚫 DNC contacts: ${dncInternal}`);
    console.log(`✅ Should be callable: ${shouldBeCallable}`);
    console.log(`❌ Actual callable: ${callable}`);
    console.log(`🔍 Missing: ${shouldBeCallable - callable} contacts not marked as callable`);
    
  } catch (error) {
    console.error('💥 Check failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the check
checkDNCStatus();