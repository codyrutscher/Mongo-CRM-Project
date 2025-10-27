const mongoose = require('mongoose');
require('dotenv').config();
const Contact = require('./src/models/Contact');

async function getCustomFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const sheetsSample = await Contact.find({ 
      source: 'google_sheets',
      email: { $not: /placeholder/ }
    }).limit(100);
    
    console.log(`Analyzing ${sheetsSample.length} Google Sheets contacts...`);
    
    const customFieldStats = {};
    
    sheetsSample.forEach(contact => {
      if (contact.customFields) {
        for (const [key, value] of contact.customFields) {
          if (value && value !== '') {
            if (!customFieldStats[key]) {
              customFieldStats[key] = { count: 0, samples: [] };
            }
            customFieldStats[key].count++;
            if (customFieldStats[key].samples.length < 3) {
              customFieldStats[key].samples.push(value);
            }
          }
        }
      }
    });
    
    console.log('\nGoogle Sheets Custom Fields (with usage):');
    Object.keys(customFieldStats)
      .sort((a, b) => customFieldStats[b].count - customFieldStats[a].count)
      .forEach(key => {
        const percentage = (customFieldStats[key].count / 100 * 100).toFixed(1);
        console.log(`${key}: ${customFieldStats[key].count}/100 (${percentage}%) - Examples: ${customFieldStats[key].samples.join(', ')}`);
      });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

getCustomFields();