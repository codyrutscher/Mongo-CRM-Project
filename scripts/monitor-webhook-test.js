require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

async function monitorContact(email) {
  try {
    console.log('👀 Monitoring Contact for Changes\n');
    console.log(`Email: ${email}`);
    console.log('Checking every 5 seconds... (Press Ctrl+C to stop)\n');
    
    await mongoose.connect(process.env.RAILWAY_MONGODB_URI);
    
    let lastState = null;
    
    setInterval(async () => {
      const contact = await Contact.findOne({ email }).select('dnc___buyer_outreach updatedAt');
      
      if (!contact) {
        console.log('❌ Contact not found');
        return;
      }
      
      const currentState = {
        dncBuyer: contact.dnc___buyer_outreach || false,
        updatedAt: contact.updatedAt
      };
      
      if (!lastState || 
          lastState.dncBuyer !== currentState.dncBuyer || 
          lastState.updatedAt.getTime() !== currentState.updatedAt.getTime()) {
        
        console.log(`[${new Date().toLocaleTimeString()}] DNC Buyer: ${currentState.dncBuyer ? '✅ YES' : '❌ NO'} | Updated: ${currentState.updatedAt.toLocaleTimeString()}`);
        
        if (lastState && lastState.dncBuyer !== currentState.dncBuyer) {
          console.log(`  🔔 CHANGE DETECTED! ${lastState.dncBuyer ? 'Removed from' : 'Added to'} DNC Buyer list`);
          console.log(`  ⏱️  Webhook should sync to Response Genius within 30 seconds\n`);
        }
        
        lastState = currentState;
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const email = process.argv[2] || 'drutscher@gmail.com';
monitorContact(email);
