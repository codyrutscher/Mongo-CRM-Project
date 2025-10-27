const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function processRawHubSpotData() {
  console.log('Processing raw HubSpot data...');
  
  try {
    // Get all contacts with raw HubSpot data
    const contacts = await prisma.contact.findMany({
      where: {
        hubspotData: {
          not: null
        }
      }
    });

    console.log(`Found ${contacts.length} contacts with raw HubSpot data`);

    let processed = 0;
    
    for (const contact of contacts) {
      try {
        const hubspotData = contact.hubspotData;
        const props = hubspotData.properties || {};
        
        // Extract and transform the data
        const updateData = {
          // Basic contact info
          email: props.email || contact.email,
          firstName: props.firstname || contact.firstName,
          lastName: props.lastname || contact.lastName,
          phone: props.phone || contact.phone,
          company: props.company || contact.company,
          
          // Additional fields
          jobTitle: props.jobtitle || null,
          website: props.website || null,
          city: props.city || null,
          state: props.state || null,
          country: props.country || null,
          
          // HubSpot specific fields
          lifecycleStage: props.lifecyclestage || null,
          hubspotOwnerId: props.hubspot_owner_id || null,
          leadStatus: props.hs_lead_status || null,
          hubspotScore: props.hubspotscore ? parseInt(props.hubspotscore) : null,
          
          // Source tracking
          originalSource: props.hs_analytics_source || null,
          latestSource: props.hs_latest_source || null,
          
          // Engagement data
          emailOptOut: props.hs_email_optout === 'true',
          lastContactedDate: props.notes_last_contacted ? new Date(props.notes_last_contacted) : null,
          
          // Deal/Revenue data
          totalRevenue: props.total_revenue ? parseFloat(props.total_revenue) : null,
          numDeals: props.num_associated_deals ? parseInt(props.num_associated_deals) : null,
          
          // Dates
          createdAt: props.createdate ? new Date(props.createdate) : contact.createdAt,
          updatedAt: props.lastmodifieddate ? new Date(props.lastmodifieddate) : new Date(),
          
          // Keep the raw data for reference
          hubspotData: hubspotData
        };

        // Update the contact with processed data
        await prisma.contact.update({
          where: { id: contact.id },
          data: updateData
        });

        processed++;
        
        if (processed % 100 === 0) {
          console.log(`Processed ${processed}/${contacts.length} contacts`);
        }
        
      } catch (error) {
        console.error(`Error processing contact ${contact.id}:`, error.message);
      }
    }

    console.log(`\n✅ Processing complete! ${processed} contacts processed`);

  } catch (error) {
    console.error('Error during processing:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the processing
processRawHubSpotData()
  .then(() => {
    console.log('Raw data processing finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Processing failed:', error);
    process.exit(1);
  });