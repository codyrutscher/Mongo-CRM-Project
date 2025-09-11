require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../src/models/Contact');

async function identifyDNCContacts() {
  try {
    console.log('🚫 === DNC CONTACT IDENTIFICATION ===');
    console.log('📋 Analyzing existing contacts for DNC patterns...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all HubSpot contacts
    const hubspotContacts = await Contact.find({ source: 'hubspot' });
    console.log(`📈 Found ${hubspotContacts.length} HubSpot contacts to analyze`);
    
    let dncMarked = 0;
    let processed = 0;
    
    for (const contact of hubspotContacts) {
      try {
        let isDNC = false;
        let dncReason = '';
        
        // Check for DNC indicators in custom fields or other data
        const customFields = contact.customFields || {};
        
        // Common DNC patterns to look for
        const dncIndicators = [
          'dnc', 'do not call', 'do_not_call', 'no call', 'nocall',
          'unsubscribe', 'opted out', 'opt out', 'remove', 'stop'
        ];
        
        // Check in various fields
        const fieldsToCheck = [
          contact.firstName?.toLowerCase(),
          contact.lastName?.toLowerCase(), 
          contact.email?.toLowerCase(),
          contact.company?.toLowerCase(),
          contact.jobTitle?.toLowerCase(),
          customFields.notes?.toLowerCase(),
          customFields.leadSource?.toLowerCase(),
          customFields.contactType?.toLowerCase()
        ].filter(Boolean);
        
        for (const field of fieldsToCheck) {
          if (dncIndicators.some(indicator => field.includes(indicator))) {
            isDNC = true;
            dncReason = 'DNC pattern detected in contact data';
            break;
          }
        }
        
        // Check for specific email patterns
        if (contact.email) {
          const suspiciousEmailPatterns = [
            'noreply', 'no-reply', 'donotreply', 'bounce', 'unsubscribe',
            'optout', 'remove', 'dnc', 'stop'
          ];
          
          if (suspiciousEmailPatterns.some(pattern => contact.email.includes(pattern))) {
            isDNC = true;
            dncReason = 'Suspicious email pattern detected';
          }
        }
        
        // Mark as DNC if patterns found
        if (isDNC && contact.dncStatus === 'callable') {
          contact.dncStatus = 'dnc_internal';
          contact.dncDate = new Date();
          contact.dncReason = dncReason;
          contact.complianceNotes = 'Auto-detected from contact data patterns';
          
          // Add DNC flag to custom fields
          contact.customFields = contact.customFields || {};
          contact.customFields.autoDncDetection = 'true';
          contact.customFields.dncDetectionReason = dncReason;
          
          await contact.save();
          dncMarked++;
          
          if (dncMarked <= 10) {
            console.log(`🚫 Marked as DNC: ${contact.firstName} ${contact.lastName} (${dncReason})`);
          }
        }
        
        processed++;
        
        if (processed % 5000 === 0) {
          console.log(`📊 Progress: ${processed}/${hubspotContacts.length} | DNC Marked: ${dncMarked}`);
        }
        
      } catch (error) {
        console.error('Error processing contact:', error.message);
      }
    }
    
    console.log('\n🎉 DNC Analysis Completed!');
    console.log(`📈 Contacts analyzed: ${processed}`);
    console.log(`🚫 Contacts marked as DNC: ${dncMarked}`);
    
    // Get final DNC breakdown
    const dncCounts = await Contact.aggregate([
      { $group: { _id: '$dncStatus', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📊 === DNC STATUS BREAKDOWN ===');
    dncCounts.forEach(status => {
      const statusLabels = {
        'callable': '✅ Callable',
        'dnc_internal': '🚫 Internal DNC',
        'dnc_federal': '🇺🇸 Federal DNC',
        'dnc_state': '🏛️  State DNC',
        'dnc_wireless': '📱 Wireless DNC'
      };
      console.log(`${statusLabels[status._id] || status._id}: ${status.count}`);
    });
    
    console.log('\n💡 === NEXT STEPS ===');
    console.log('1. Review DNC contacts in your CRM');
    console.log('2. Add HubSpot list scopes for direct sync');
    console.log('3. Export DNC segment for compliance');
    
  } catch (error) {
    console.error('💥 DNC analysis failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the DNC analysis
identifyDNCContacts();