const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrape Perfect Game roster page for average pitching velocity
 */

async function scrapePitchingVelocity(eventUrl) {
  console.log('=== Scraping Perfect Game Pitching Velocity ===\n');
  console.log(`URL: ${eventUrl}\n`);

  try {
    // Fetch the page
    console.log('📥 Fetching page...');
    const response = await axios.get(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    console.log('✅ Page loaded\n');

    // Parse HTML
    const $ = cheerio.load(response.data);
    
    const players = [];
    let totalVelocity = 0;
    let velocityCount = 0;

    // Find all player rows (adjust selectors based on actual page structure)
    $('table tr').each((index, element) => {
      const $row = $(element);
      const cells = $row.find('td');
      
      if (cells.length > 0) {
        const playerData = {
          name: '',
          position: '',
          velocity: null,
          graduationYear: '',
          team: ''
        };

        // Extract data from cells (adjust indices based on actual table structure)
        cells.each((i, cell) => {
          const text = $(cell).text().trim();
          
          // Look for velocity data (usually contains "mph" or is a number in 70-100 range)
          if (text.match(/\d+\s*mph/i)) {
            const velocity = parseInt(text.match(/(\d+)/)[1]);
            playerData.velocity = velocity;
            totalVelocity += velocity;
            velocityCount++;
          }
          
          // Try to identify other fields
          if (i === 0) playerData.name = text;
          if (text.match(/^(P|RHP|LHP|C|1B|2B|3B|SS|OF|IF)$/i)) {
            playerData.position = text;
          }
          if (text.match(/^\d{4}$/)) {
            playerData.graduationYear = text;
          }
        });

        if (playerData.name || playerData.velocity) {
          players.push(playerData);
        }
      }
    });

    // Calculate average
    const averageVelocity = velocityCount > 0 ? (totalVelocity / velocityCount).toFixed(1) : 0;

    console.log('📊 Results:\n');
    console.log(`Total Players Found: ${players.length}`);
    console.log(`Players with Velocity Data: ${velocityCount}`);
    console.log(`Average Pitching Velocity: ${averageVelocity} mph\n`);

    if (velocityCount > 0) {
      console.log('Players with Velocity:');
      players
        .filter(p => p.velocity)
        .sort((a, b) => b.velocity - a.velocity)
        .forEach(player => {
          console.log(`  ${player.name || 'Unknown'}: ${player.velocity} mph ${player.position ? `(${player.position})` : ''}`);
        });
    } else {
      console.log('⚠️  No velocity data found on this page.');
      console.log('\nDebugging info:');
      console.log('Sample of page content:');
      console.log($('body').text().substring(0, 500));
    }

    return {
      totalPlayers: players.length,
      playersWithVelocity: velocityCount,
      averageVelocity: parseFloat(averageVelocity),
      players: players.filter(p => p.velocity)
    };

  } catch (error) {
    console.error('❌ Error scraping page:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
    throw error;
  }
}

// Run the scraper
const eventUrl = process.argv[2] || 'https://www.perfectgame.org/events/Rosters.aspx?event=1289';

scrapePitchingVelocity(eventUrl)
  .then(results => {
    console.log('\n✅ Scraping complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Scraping failed');
    process.exit(1);
  });
