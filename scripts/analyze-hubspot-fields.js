const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeHubSpotFields() {
  console.log('Analyzing HubSpot field usage...');
  
  try {
    // Get a sample of contacts with raw data
    const contacts = await prisma.contact.findMany({
      where: {
        hubspotData: {
          not: null
        }
      },
      take: 100 // Sample first 100 contacts
    });

    if (contacts.length === 0) {
      console.log('No contacts with HubSpot data found');
      return;
    }

    console.log(`Analyzing ${contacts.length} contacts...`);

    const fieldUsage = {};
    const fieldSamples = {};

    for (const contact of contacts) {
      const props = contact.hubspotData?.properties || {};
      
      for (const [field, value] of Object.entries(props)) {
        if (!fieldUsage[field]) {
          fieldUsage[field] = 0;
          fieldSamples[field] = [];
        }
        
        if (value !== null && value !== undefined && value !== '') {
          fieldUsage[field]++;
          
          // Store sample values (max 3 per field)
          if (fieldSamples[field].length < 3 && !fieldSamples[field].includes(value)) {
            fieldSamples[field].push(value);
          }
        }
      }
    }

    // Sort fields by usage
    const sortedFields = Object.entries(fieldUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 50); // Top 50 most used fields

    console.log('\n📊 Top HubSpot Fields by Usage:');
    console.log('=====================================');
    
    for (const [field, count] of sortedFields) {
      const percentage = ((count / contacts.length) * 100).toFixed(1);
      const samples = fieldSamples[field].slice(0, 2).join(', ');
      console.log(`${field}: ${count}/${contacts.length} (${percentage}%) - Examples: ${samples}`);
    }

    // Show all available fields
    console.log(`\n📋 All Available Fields (${Object.keys(fieldUsage).length} total):`);
    console.log('=====================================');
    const allFields = Object.keys(fieldUsage).sort();
    for (let i = 0; i < allFields.length; i += 4) {
      const row = allFields.slice(i, i + 4).join(', ');
      console.log(row);
    }

  } catch (error) {
    console.error('Error during analysis:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeHubSpotFields()
  .then(() => {
    console.log('\nField analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });