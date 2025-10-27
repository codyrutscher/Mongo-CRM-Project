require('dotenv').config();
const mongoose = require('mongoose');

async function safeCountAnalysis() {
  try {
    console.log('🔍 === SAFE COUNT ANALYSIS ===');
    console.log('⚠️  This script will ONLY analyze, not delete anything');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const contactsCollection = db.collection('contacts');
    
    const currentTotal = await contactsCollection.countDocuments();
    console.log(`\n📊 Current Prospere CRM: ${currentTotal} contacts`);
    console.log('📊 Target HubSpot count: ~135,815 contacts');
    console.log(`📊 Missing: ~${135815 - currentTotal} contacts`);
    
    console.log('\n🚨 CRITICAL SITUATION DETECTED:');
    console.log('Most contacts were accidentally deleted due to HubSpot API error.');
    console.log('We need to restore the data.');
    
    console.log('\n💡 RECOVERY OPTIONS:');
    console.log('1. Wait for HubSpot API to recover and run full sync');
    console.log('2. Restore from backup if available');
    console.log('3. Use webhook to gradually rebuild as contacts are updated');
    
    console.log('\n📋 CURRENT DATA BREAKDOWN:');
    
    // Check what data we still have
    const sourceCounts = await contactsCollection.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]).toArray();
    
    sourceCounts.forEach(item => {
      console.log(`  ${item._id}: ${item.count} contacts`);
    });
    
    // Check recent contacts (these might be the most important)
    const recentContacts = await contactsCollection.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log('\n📅 Recent contacts (last 7 days):');
    recentContacts.forEach((contact, i) => {
      console.log(`  ${i+1}. ${contact.firstName} ${contact.lastName} - ${contact.email}`);
    });
    
    console.log('\n⚠️  RECOMMENDATION:');
    console.log('DO NOT run any deletion scripts until HubSpot API is stable.');
    console.log('The 33-contact difference was acceptable and normal for a live system.');
    console.log('Focus on restoring the ~134K deleted contacts first.');
    
  } catch (error) {
    console.error('💥 Analysis failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run safe analysis
safeCountAnalysis();