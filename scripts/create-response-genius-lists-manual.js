require('dotenv').config();

console.log('\n' + '='.repeat(60));
console.log('MANUAL LIST CREATION INSTRUCTIONS');
console.log('='.repeat(60));

console.log('\nThe Response Genius API requires lists to be created manually');
console.log('through the web interface first.\n');

console.log('Please follow these steps:\n');

console.log('1. Log in to Response Genius:');
console.log('   https://control.responsegenius.com\n');

console.log('2. Navigate to Lists section\n');

console.log('3. Create these 4 lists with EXACT names:\n');

const lists = [
  { id: process.env.RESPONSE_GENIUS_SELLER_LIST_ID, name: 'DNC - Seller outreach' },
  { id: process.env.RESPONSE_GENIUS_BUYER_LIST_ID, name: 'DNC - Buyer outreach' },
  { id: process.env.RESPONSE_GENIUS_CRE_LIST_ID, name: 'DNC - CRE outreach' },
  { id: process.env.RESPONSE_GENIUS_EXF_LIST_ID, name: 'DNC - EXF outreach' }
];

lists.forEach((list, index) => {
  console.log(`   ${index + 1}. List Name: "${list.name}"`);
  console.log(`      API Identifier: "${list.id}"`);
  console.log('');
});

console.log('4. After creating the lists, run:');
console.log('   node scripts/test-dnc-list-sync.js\n');

console.log('5. Then sync contacts:');
console.log('   node scripts/sync-dnc-lists-to-response-genius.js\n');

console.log('='.repeat(60));
console.log('\nAlternatively, we can use the Global Suppression List');
console.log('which doesn\'t require list creation.');
console.log('='.repeat(60));
