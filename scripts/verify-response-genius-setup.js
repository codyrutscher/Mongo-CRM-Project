require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Verify Response Genius integration setup
 */

function verifyResponseGeniusSetup() {
  console.log('=== Response Genius Integration Verification ===\n');

  const checks = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  // Check 1: Environment variables
  console.log('1️⃣  Checking environment variables...');
  const apiId = process.env.RESPONSE_GENIUS_API_ID;
  const apiKey = process.env.RESPONSE_GENIUS_API_KEY;
  const apiUrl = process.env.RESPONSE_GENIUS_API_URL;
  
  if (apiId && apiId !== 'your_api_id_here') {
    console.log('   ✅ RESPONSE_GENIUS_API_ID is set');
    checks.passed++;
  } else {
    console.log('   ⚠️  RESPONSE_GENIUS_API_ID not configured (running in DRY RUN mode)');
    checks.warnings++;
  }
  
  if (apiKey && apiKey !== 'your_api_key_here') {
    console.log('   ✅ RESPONSE_GENIUS_API_KEY is set');
    checks.passed++;
  } else {
    console.log('   ⚠️  RESPONSE_GENIUS_API_KEY not configured (running in DRY RUN mode)');
    checks.warnings++;
  }

  if (apiUrl) {
    console.log(`   ✅ RESPONSE_GENIUS_API_URL: ${apiUrl}`);
    checks.passed++;
  } else {
    console.log('   ⚠️  RESPONSE_GENIUS_API_URL not set (using default)');
    checks.warnings++;
  }

  // Check list IDs
  const lists = ['SELLER', 'BUYER', 'CRE', 'EXF'];
  lists.forEach(list => {
    const envVar = `RESPONSE_GENIUS_${list}_LIST_ID`;
    const value = process.env[envVar];
    if (value) {
      console.log(`   ✅ ${envVar}: ${value}`);
      checks.passed++;
    } else {
      console.log(`   ⚠️  ${envVar} not set (using default)`);
      checks.warnings++;
    }
  });

  // Check 2: Service file exists
  console.log('\n2️⃣  Checking service files...');
  const serviceFile = path.join(__dirname, '../src/services/responseGeniusService.js');
  if (fs.existsSync(serviceFile)) {
    console.log('   ✅ responseGeniusService.js exists');
    checks.passed++;
  } else {
    console.log('   ❌ responseGeniusService.js NOT FOUND');
    checks.failed++;
  }

  // Check 3: Routes file exists
  const routesFile = path.join(__dirname, '../src/routes/responseGenius.js');
  if (fs.existsSync(routesFile)) {
    console.log('   ✅ responseGenius.js routes exist');
    checks.passed++;
  } else {
    console.log('   ❌ responseGenius.js routes NOT FOUND');
    checks.failed++;
  }

  // Check 4: Routes registered
  console.log('\n3️⃣  Checking route registration...');
  const indexFile = path.join(__dirname, '../src/routes/index.js');
  if (fs.existsSync(indexFile)) {
    const content = fs.readFileSync(indexFile, 'utf8');
    if (content.includes('responseGenius')) {
      console.log('   ✅ Response Genius routes registered in index.js');
      checks.passed++;
    } else {
      console.log('   ❌ Response Genius routes NOT registered in index.js');
      checks.failed++;
    }
  }

  // Check 5: Webhook service integration
  console.log('\n4️⃣  Checking webhook service integration...');
  const webhookFile = path.join(__dirname, '../src/services/webhookService.js');
  if (fs.existsSync(webhookFile)) {
    const content = fs.readFileSync(webhookFile, 'utf8');
    if (content.includes('responseGeniusService')) {
      console.log('   ✅ Response Genius integrated into webhook service');
      checks.passed++;
    } else {
      console.log('   ❌ Response Genius NOT integrated into webhook service');
      checks.failed++;
    }
  }

  // Check 6: Scripts exist
  console.log('\n5️⃣  Checking scripts...');
  const scripts = [
    'test-response-genius-integration.js',
    'initial-response-genius-sync.js'
  ];

  scripts.forEach(script => {
    const scriptPath = path.join(__dirname, script);
    if (fs.existsSync(scriptPath)) {
      console.log(`   ✅ ${script} exists`);
      checks.passed++;
    } else {
      console.log(`   ❌ ${script} NOT FOUND`);
      checks.failed++;
    }
  });

  // Check 7: Documentation
  console.log('\n6️⃣  Checking documentation...');
  const docs = [
    '../docs/RESPONSE_GENIUS_SETUP.md',
    '../RESPONSE_GENIUS_INTEGRATION.md'
  ];

  docs.forEach(doc => {
    const docPath = path.join(__dirname, doc);
    if (fs.existsSync(docPath)) {
      console.log(`   ✅ ${path.basename(doc)} exists`);
      checks.passed++;
    } else {
      console.log(`   ⚠️  ${path.basename(doc)} not found`);
      checks.warnings++;
    }
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${checks.passed}`);
  console.log(`⚠️  Warnings: ${checks.warnings}`);
  console.log(`❌ Failed: ${checks.failed}`);
  console.log('');

  if (checks.failed === 0) {
    console.log('🎉 Integration setup is complete!');
    console.log('');
    console.log('Next steps:');
    if (checks.warnings > 0) {
      console.log('1. Get API credentials: https://control.responsegenius.com/help/api_identifier');
      console.log('2. Add RESPONSE_GENIUS_API_ID and RESPONSE_GENIUS_API_KEY to .env');
      console.log('3. Run: node scripts/test-response-genius-integration.js');
      console.log('4. Run: node scripts/initial-response-genius-sync.js');
    } else {
      console.log('1. Run: node scripts/test-response-genius-integration.js');
      console.log('2. Run: node scripts/initial-response-genius-sync.js');
      console.log('3. Restart your server');
    }
  } else {
    console.log('❌ Setup incomplete. Please fix the failed checks above.');
  }

  console.log('');
  return checks.failed === 0;
}

const success = verifyResponseGeniusSetup();
process.exit(success ? 0 : 1);
