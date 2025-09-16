#!/usr/bin/env node

/**
 * Dashboard Stats Test Script
 * 
 * This script tests each individual query from the dashboard stats calculation
 * to identify where the 250k clean contacts issue is coming from.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('./src/models/Contact');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

async function testDashboardCalculations() {
  console.log('\n🔍 DASHBOARD STATS CALCULATION TEST\n');
  console.log('=' .repeat(60));

  try {
    // 1. BASIC COUNTS
    console.log('\n📊 BASIC COUNTS:');
    console.log('-'.repeat(30));
    
    const totalContacts = await Contact.countDocuments();
    console.log(`Total Contacts: ${totalContacts.toLocaleString()}`);

    const hubspotCount = await Contact.countDocuments({ source: 'hubspot' });
    const sheetsCount = await Contact.countDocuments({ source: 'google_sheets' });
    const csvCount = await Contact.countDocuments({ source: { $regex: '^csv_' } });
    
    console.log(`HubSpot Contacts: ${hubspotCount.toLocaleString()}`);
    console.log(`Sheets Contacts: ${sheetsCount.toLocaleString()}`);
    console.log(`CSV Contacts: ${csvCount.toLocaleString()}`);
    console.log(`Source Total: ${(hubspotCount + sheetsCount + csvCount).toLocaleString()}`);

    // 2. CLEAN CONTACTS (All 5 fields required)
    console.log('\n🧹 CLEAN CONTACTS (firstName + lastName + email + phone + company):');
    console.log('-'.repeat(60));

    const cleanQuery = {
      firstName: { $exists: true, $ne: "", $ne: null },
      lastName: { $exists: true, $ne: "", $ne: null },
      email: { $exists: true, $ne: "", $ne: null },
      phone: { $exists: true, $ne: "", $ne: null },
      company: { $exists: true, $ne: "", $ne: null },
    };

    // Test each source individually
    const cleanHubSpot = await Contact.countDocuments({
      source: "hubspot",
      ...cleanQuery
    });

    const cleanSheets = await Contact.countDocuments({
      source: "google_sheets", 
      ...cleanQuery
    });

    const cleanCSV = await Contact.countDocuments({
      source: { $regex: "^csv_" },
      ...cleanQuery
    });

    // Test total without source filter
    const cleanTotal = await Contact.countDocuments(cleanQuery);

    console.log(`Clean HubSpot: ${cleanHubSpot.toLocaleString()}`);
    console.log(`Clean Sheets: ${cleanSheets.toLocaleString()}`);
    console.log(`Clean CSV: ${cleanCSV.toLocaleString()}`);
    console.log(`Clean Sum (HubSpot + Sheets + CSV): ${(cleanHubSpot + cleanSheets + cleanCSV).toLocaleString()}`);
    console.log(`Clean Total (no source filter): ${cleanTotal.toLocaleString()}`);
    
    if (cleanTotal !== (cleanHubSpot + cleanSheets + cleanCSV)) {
      console.log('⚠️  WARNING: Clean total doesn\'t match sum of sources!');
      console.log(`   Difference: ${cleanTotal - (cleanHubSpot + cleanSheets + cleanCSV)}`);
    }

    // 3. EMAIL ONLY CONTACTS (email but no phone)
    console.log('\n📧 EMAIL ONLY CONTACTS (email exists, phone missing):');
    console.log('-'.repeat(50));

    const emailOnlyQuery = {
      email: { $exists: true, $ne: "", $ne: null },
      $or: [{ phone: { $exists: false } }, { phone: "" }, { phone: null }],
    };

    const emailHubSpot = await Contact.countDocuments({
      source: "hubspot",
      ...emailOnlyQuery
    });

    const emailSheets = await Contact.countDocuments({
      source: "google_sheets",
      ...emailOnlyQuery
    });

    const emailCSV = await Contact.countDocuments({
      source: { $regex: "^csv_" },
      ...emailOnlyQuery
    });

    const emailTotal = await Contact.countDocuments(emailOnlyQuery);

    console.log(`Email-Only HubSpot: ${emailHubSpot.toLocaleString()}`);
    console.log(`Email-Only Sheets: ${emailSheets.toLocaleString()}`);
    console.log(`Email-Only CSV: ${emailCSV.toLocaleString()}`);
    console.log(`Email-Only Sum: ${(emailHubSpot + emailSheets + emailCSV).toLocaleString()}`);
    console.log(`Email-Only Total: ${emailTotal.toLocaleString()}`);

    if (emailTotal !== (emailHubSpot + emailSheets + emailCSV)) {
      console.log('⚠️  WARNING: Email-only total doesn\'t match sum of sources!');
      console.log(`   Difference: ${emailTotal - (emailHubSpot + emailSheets + emailCSV)}`);
    }

    // 4. PHONE ONLY CONTACTS (phone but no email)
    console.log('\n📱 PHONE ONLY CONTACTS (phone exists, email missing):');
    console.log('-'.repeat(50));

    const phoneOnlyQuery = {
      phone: { $exists: true, $ne: "", $ne: null },
      $or: [{ email: { $exists: false } }, { email: "" }, { email: null }],
    };

    const phoneHubSpot = await Contact.countDocuments({
      source: "hubspot",
      ...phoneOnlyQuery
    });

    const phoneSheets = await Contact.countDocuments({
      source: "google_sheets",
      ...phoneOnlyQuery
    });

    const phoneCSV = await Contact.countDocuments({
      source: { $regex: "^csv_" },
      ...phoneOnlyQuery
    });

    const phoneTotal = await Contact.countDocuments(phoneOnlyQuery);

    console.log(`Phone-Only HubSpot: ${phoneHubSpot.toLocaleString()}`);
    console.log(`Phone-Only Sheets: ${phoneSheets.toLocaleString()}`);
    console.log(`Phone-Only CSV: ${phoneCSV.toLocaleString()}`);
    console.log(`Phone-Only Sum: ${(phoneHubSpot + phoneSheets + phoneCSV).toLocaleString()}`);
    console.log(`Phone-Only Total: ${phoneTotal.toLocaleString()}`);

    if (phoneTotal !== (phoneHubSpot + phoneSheets + phoneCSV)) {
      console.log('⚠️  WARNING: Phone-only total doesn\'t match sum of sources!');
      console.log(`   Difference: ${phoneTotal - (phoneHubSpot + phoneSheets + phoneCSV)}`);
    }

    // 5. DASHBOARD TOTALS (what the frontend sees)
    console.log('\n📈 DASHBOARD TOTALS:');
    console.log('-'.repeat(30));

    const dashboardCleanTotal = cleanHubSpot + cleanSheets + cleanCSV;
    const dashboardEmailTotal = emailHubSpot + emailSheets + emailCSV;
    const dashboardPhoneTotal = phoneHubSpot + phoneSheets + phoneCSV;

    console.log(`Dashboard Clean Total: ${dashboardCleanTotal.toLocaleString()}`);
    console.log(`Dashboard Email-Only Total: ${dashboardEmailTotal.toLocaleString()}`);
    console.log(`Dashboard Phone-Only Total: ${dashboardPhoneTotal.toLocaleString()}`);
    console.log(`Dashboard Grand Total: ${(dashboardCleanTotal + dashboardEmailTotal + dashboardPhoneTotal).toLocaleString()}`);

    // 6. FIELD EXISTENCE ANALYSIS
    console.log('\n🔍 FIELD EXISTENCE ANALYSIS:');
    console.log('-'.repeat(40));

    const hasFirstName = await Contact.countDocuments({ firstName: { $exists: true, $ne: '', $ne: null } });
    const hasLastName = await Contact.countDocuments({ lastName: { $exists: true, $ne: '', $ne: null } });
    const hasEmail = await Contact.countDocuments({ email: { $exists: true, $ne: '', $ne: null } });
    const hasPhone = await Contact.countDocuments({ phone: { $exists: true, $ne: '', $ne: null } });
    const hasCompany = await Contact.countDocuments({ company: { $exists: true, $ne: '', $ne: null } });

    console.log(`Contacts with firstName: ${hasFirstName.toLocaleString()}`);
    console.log(`Contacts with lastName: ${hasLastName.toLocaleString()}`);
    console.log(`Contacts with email: ${hasEmail.toLocaleString()}`);
    console.log(`Contacts with phone: ${hasPhone.toLocaleString()}`);
    console.log(`Contacts with company: ${hasCompany.toLocaleString()}`);

    // 7. STEP-BY-STEP CLEAN QUERY
    console.log('\n🪜 STEP-BY-STEP CLEAN QUERY:');
    console.log('-'.repeat(35));

    const step1 = await Contact.countDocuments({
      firstName: { $exists: true, $ne: '', $ne: null }
    });

    const step2 = await Contact.countDocuments({
      firstName: { $exists: true, $ne: '', $ne: null },
      lastName: { $exists: true, $ne: '', $ne: null }
    });

    const step3 = await Contact.countDocuments({
      firstName: { $exists: true, $ne: '', $ne: null },
      lastName: { $exists: true, $ne: '', $ne: null },
      email: { $exists: true, $ne: '', $ne: null }
    });

    const step4 = await Contact.countDocuments({
      firstName: { $exists: true, $ne: '', $ne: null },
      lastName: { $exists: true, $ne: '', $ne: null },
      email: { $exists: true, $ne: '', $ne: null },
      phone: { $exists: true, $ne: '', $ne: null }
    });

    const step5 = await Contact.countDocuments({
      firstName: { $exists: true, $ne: '', $ne: null },
      lastName: { $exists: true, $ne: '', $ne: null },
      email: { $exists: true, $ne: '', $ne: null },
      phone: { $exists: true, $ne: '', $ne: null },
      company: { $exists: true, $ne: '', $ne: null }
    });

    console.log(`Step 1 (firstName): ${step1.toLocaleString()}`);
    console.log(`Step 2 (+lastName): ${step2.toLocaleString()}`);
    console.log(`Step 3 (+email): ${step3.toLocaleString()}`);
    console.log(`Step 4 (+phone): ${step4.toLocaleString()}`);
    console.log(`Step 5 (+company): ${step5.toLocaleString()}`);

    // 8. SAMPLE DATA INSPECTION
    console.log('\n🔬 SAMPLE DATA INSPECTION:');
    console.log('-'.repeat(35));

    const sampleContacts = await Contact.find({}).limit(5).lean();
    console.log('Sample contacts:');
    sampleContacts.forEach((contact, index) => {
      console.log(`  ${index + 1}. Source: ${contact.source || 'MISSING'}`);
      console.log(`     firstName: "${contact.firstName || 'EMPTY'}"`);
      console.log(`     lastName: "${contact.lastName || 'EMPTY'}"`);
      console.log(`     email: "${contact.email || 'EMPTY'}"`);
      console.log(`     phone: "${contact.phone || 'EMPTY'}"`);
      console.log(`     company: "${contact.company || 'EMPTY'}"`);
      console.log('');
    });

    // 9. POTENTIAL ISSUES DETECTION
    console.log('\n🚨 POTENTIAL ISSUES DETECTION:');
    console.log('-'.repeat(40));

    // Check for contacts with unknown sources
    const unknownSources = await Contact.aggregate([
      {
        $match: {
          source: { 
            $nin: ['hubspot', 'google_sheets'],
            $not: { $regex: '^csv_' }
          }
        }
      },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    if (unknownSources.length > 0) {
      console.log('⚠️  Unknown sources found:');
      unknownSources.forEach(source => {
        console.log(`   ${source._id}: ${source.count.toLocaleString()} contacts`);
      });
    } else {
      console.log('✅ All contacts have known sources');
    }

    // Check for empty company strings vs null/undefined
    const emptyCompanyString = await Contact.countDocuments({ company: "" });
    const nullCompany = await Contact.countDocuments({ company: null });
    const undefinedCompany = await Contact.countDocuments({ company: { $exists: false } });

    console.log(`Empty company string (""): ${emptyCompanyString.toLocaleString()}`);
    console.log(`Null company: ${nullCompany.toLocaleString()}`);
    console.log(`Undefined company: ${undefinedCompany.toLocaleString()}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Dashboard stats test completed!');

  } catch (error) {
    console.error('❌ Error during dashboard stats test:', error);
  }
}

async function main() {
  await connectDB();
  await testDashboardCalculations();
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

// Run the test
main().catch(console.error);