const mongoose = require('mongoose');
require('dotenv').config();
const Contact = require('./src/models/Contact');

async function analyzeAllSources() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('=== HUBSPOT DATA ANALYSIS ===');
    const hubspotSample = await Contact.find({ source: 'hubspot' }).limit(100);
    const hubspotFields = {
      firstName: 0, lastName: 0, email: 0, phone: 0, company: 0, jobTitle: 0,
      addressCity: 0, addressState: 0, addressZip: 0,
      lifecycleStage: 0, dncStatus: 0,
      contactType: 0, businessCategory: 0, leadSource: 0
    };
    
    hubspotSample.forEach(contact => {
      if (contact.firstName) hubspotFields.firstName++;
      if (contact.lastName) hubspotFields.lastName++;
      if (contact.email && !contact.email.includes('placeholder')) hubspotFields.email++;
      if (contact.phone) hubspotFields.phone++;
      if (contact.company) hubspotFields.company++;
      if (contact.jobTitle) hubspotFields.jobTitle++;
      if (contact.address && contact.address.city) hubspotFields.addressCity++;
      if (contact.address && contact.address.state) hubspotFields.addressState++;
      if (contact.address && contact.address.zipCode) hubspotFields.addressZip++;
      if (contact.lifecycleStage) hubspotFields.lifecycleStage++;
      if (contact.dncStatus) hubspotFields.dncStatus++;
      if (contact.customFields && contact.customFields.get('contactType')) hubspotFields.contactType++;
      if (contact.customFields && contact.customFields.get('businessCategory')) hubspotFields.businessCategory++;
      if (contact.customFields && contact.customFields.get('leadSource')) hubspotFields.leadSource++;
    });
    
    console.log('HubSpot field usage (sample of 100):');
    Object.keys(hubspotFields).forEach(field => {
      const percentage = (hubspotFields[field] / 100 * 100).toFixed(1);
      console.log(`- ${field}: ${hubspotFields[field]}/100 (${percentage}%)`);
    });
    
    console.log('\n=== CSV DATA ANALYSIS ===');
    const csvSample = await Contact.find({ source: 'csv_upload' }).limit(100);
    const csvFields = {
      firstName: 0, lastName: 0, email: 0, phone: 0, company: 0, jobTitle: 0,
      addressCity: 0, addressState: 0, addressZip: 0,
      sicCode: 0, naicsCode: 0, businessCategory: 0, numberOfEmployees: 0,
      websiteUrl: 0, contactType: 0, leadSource: 0, yearEstablished: 0
    };
    
    csvSample.forEach(contact => {
      if (contact.firstName) csvFields.firstName++;
      if (contact.lastName) csvFields.lastName++;
      if (contact.email && !contact.email.includes('placeholder')) csvFields.email++;
      if (contact.phone) csvFields.phone++;
      if (contact.company) csvFields.company++;
      if (contact.jobTitle) csvFields.jobTitle++;
      if (contact.address && contact.address.city) csvFields.addressCity++;
      if (contact.address && contact.address.state) csvFields.addressState++;
      if (contact.address && contact.address.zipCode) csvFields.addressZip++;
      if (contact.customFields && contact.customFields.get('sicCode')) csvFields.sicCode++;
      if (contact.customFields && contact.customFields.get('naicsCode')) csvFields.naicsCode++;
      if (contact.customFields && contact.customFields.get('businessCategory')) csvFields.businessCategory++;
      if (contact.customFields && contact.customFields.get('numberOfEmployees')) csvFields.numberOfEmployees++;
      if (contact.customFields && contact.customFields.get('websiteUrl')) csvFields.websiteUrl++;
      if (contact.customFields && contact.customFields.get('contactType')) csvFields.contactType++;
      if (contact.customFields && contact.customFields.get('leadSource')) csvFields.leadSource++;
      if (contact.customFields && contact.customFields.get('yearEstablished')) csvFields.yearEstablished++;
    });
    
    console.log('CSV field usage (sample of 100):');
    Object.keys(csvFields).forEach(field => {
      const percentage = (csvFields[field] / 100 * 100).toFixed(1);
      console.log(`- ${field}: ${csvFields[field]}/100 (${percentage}%)`);
    });
    
    console.log('\n=== GOOGLE SHEETS DATA ANALYSIS ===');
    const sheetsSample = await Contact.find({ source: 'google_sheets' }).limit(100);
    const sheetsFields = {
      firstName: 0, lastName: 0, email: 0, phone: 0, company: 0, jobTitle: 0,
      addressCity: 0, addressState: 0, addressCountry: 0,
      sheetName: 0, specialtyBusiness: 0, callTime: 0, emailStatus: 0
    };
    
    sheetsSample.forEach(contact => {
      if (contact.firstName) sheetsFields.firstName++;
      if (contact.lastName) sheetsFields.lastName++;
      if (contact.email && !contact.email.includes('placeholder')) sheetsFields.email++;
      if (contact.phone) sheetsFields.phone++;
      if (contact.company) sheetsFields.company++;
      if (contact.jobTitle) sheetsFields.jobTitle++;
      if (contact.address && contact.address.city) sheetsFields.addressCity++;
      if (contact.address && contact.address.state) sheetsFields.addressState++;
      if (contact.address && contact.address.country) sheetsFields.addressCountry++;
      if (contact.customFields && contact.customFields.get('sheetName')) sheetsFields.sheetName++;
      if (contact.customFields && contact.customFields.get('Final_Specialty_Business')) sheetsFields.specialtyBusiness++;
      if (contact.customFields && contact.customFields.get('Call_Time')) sheetsFields.callTime++;
      if (contact.customFields && contact.customFields.get('Valid / Valid Catch all')) sheetsFields.emailStatus++;
    });
    
    console.log('Google Sheets field usage (sample of 100):');
    Object.keys(sheetsFields).forEach(field => {
      const percentage = (sheetsFields[field] / 100 * 100).toFixed(1);
      console.log(`- ${field}: ${sheetsFields[field]}/100 (${percentage}%)`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeAllSources();
