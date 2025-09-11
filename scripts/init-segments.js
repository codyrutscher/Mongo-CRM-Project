require('dotenv').config();
const mongoose = require('mongoose');
const segmentService = require('../src/services/segmentService');

async function initializeSegments() {
  try {
    console.log('🎯 === INITIALIZING DEFAULT SEGMENTS ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Initialize default segments
    await segmentService.initializeDefaultSegments();
    console.log('✅ Default segments initialized');
    
    // Get all segments to verify
    const segments = await segmentService.getAllSegments();
    console.log(`📊 Total segments created: ${segments.length}`);
    
    segments.forEach(segment => {
      console.log(`📋 ${segment.name}: ${segment.contactCount} contacts (${segment.isSystem ? 'System' : 'Custom'})`);
    });
    
  } catch (error) {
    console.error('💥 Segments initialization failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the initialization
initializeSegments();