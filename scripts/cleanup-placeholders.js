require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

async function cleanupPlaceholderContacts() {
  try {
    console.log('🧹 === CLEANING UP PLACEHOLDER CONTACTS ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all placeholder email contacts
    const placeholderContacts = await Contact.find({
      email: { $regex: /placeholder.*@.*\.placeholder/ }
    });
    
    console.log(`📊 Found ${placeholderContacts.length} placeholder contacts`);
    
    if (placeholderContacts.length === 0) {
      console.log('✨ No placeholder contacts found to clean up');
      return;
    }
    
    // Show sample before deletion
    console.log('\n📋 Sample placeholder contacts:');
    placeholderContacts.slice(0, 5).forEach(contact => {
      console.log(`- ${contact.firstName} ${contact.lastName} | ${contact.email} | ${contact.source}`);
    });
    
    // Option 1: Delete all placeholder contacts
    console.log('\n🗑️  Option 1: Delete all placeholder contacts');
    const deleteResult = await Contact.deleteMany({
      email: { $regex: /placeholder.*@.*\.placeholder/ }
    });
    
    console.log(`✅ Deleted ${deleteResult.deletedCount} placeholder contacts`);
    
    // Get updated stats
    const finalStats = await Contact.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📊 === UPDATED DATABASE STATS ===');
    finalStats.forEach(source => {
      console.log(`📈 ${source._id}: ${source.count} contacts`);
    });
    
    const totalContacts = await Contact.countDocuments();
    console.log(`🎯 Total contacts: ${totalContacts}`);
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run cleanup
cleanupPlaceholderContacts();