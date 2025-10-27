const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

/**
 * Scrape Perfect Game team roster and get average pitching velocity
 * by visiting each player's individual page
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getPlayerLinks(rosterUrl) {
  console.log('📋 Step 1: Getting player links from roster page...\n');
  
  try {
    const response = await axios.get(rosterUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const playerLinks = [];

    // Find all player profile links
    $('a[href*="/Players/Playerprofile.aspx"]').each((i, element) => {
      const href = $(element).attr('href');
      const playerName = $(element).text().trim();
      
      if (href && playerName) {
        let fullUrl;
        if (href.startsWith('http')) {
          fullUrl = href;
        } else if (href.startsWith('../')) {
          // Handle relative paths like ../Players/...
          fullUrl = `https://www.perfectgame.org${href.substring(2)}`;
        } else if (href.startsWith('/')) {
          fullUrl = `https://www.perfectgame.org${href}`;
        } else {
          fullUrl = `https://www.perfectgame.org/${href}`;
        }
        
        playerLinks.push({
          name: playerName,
          url: fullUrl
        });
      }
    });

    // Remove duplicates
    const uniqueLinks = Array.from(new Map(
      playerLinks.map(p => [p.url, p])
    ).values());

    console.log(`✅ Found ${uniqueLinks.length} unique players\n`);
    return uniqueLinks;

  } catch (error) {
    console.error('❌ Error fetching roster:', error.message);
    throw error;
  }
}

async function getPlayerVelocity(playerUrl, playerName, retries = 3) {
  try {
    const response = await axios.get(playerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    let velocity = null;

    // Look for velocity in various possible locations
    const text = $('body').text();
    
    // Pattern 1: "Fastball: 85 mph" or "FB: 85"
    const fbMatch = text.match(/(?:Fastball|FB|Velocity)[\s:]+(\d+)\s*mph/i);
    if (fbMatch) {
      velocity = parseInt(fbMatch[1]);
    }

    // Pattern 2: Look in tables for velocity data
    if (!velocity) {
      $('table tr').each((i, row) => {
        const $row = $(row);
        const rowText = $row.text();
        
        if (rowText.match(/fastball|velocity|fb/i)) {
          const velMatch = rowText.match(/(\d+)\s*mph/i);
          if (velMatch) {
            velocity = parseInt(velMatch[1]);
          }
        }
      });
    }

    // Pattern 3: Look for any number followed by mph in reasonable range
    if (!velocity) {
      const allVelocities = text.match(/(\d+)\s*mph/gi);
      if (allVelocities) {
        for (const vel of allVelocities) {
          const num = parseInt(vel.match(/(\d+)/)[1]);
          if (num >= 60 && num <= 105) { // Reasonable velocity range
            velocity = num;
            break;
          }
        }
      }
    }

    return velocity;

  } catch (error) {
    console.error(`  ❌ Error fetching ${playerName}: ${error.message}`);
    return null;
  }
}

async function scrapeTeamVelocity(rosterUrl) {
  console.log('=== Perfect Game Team Velocity Scraper ===\n');
  console.log(`Event URL: ${rosterUrl}\n`);

  try {
    // Step 1: Get all player links
    const players = await getPlayerLinks(rosterUrl);

    if (players.length === 0) {
      console.log('❌ No players found on roster page');
      return;
    }

    // Step 2: Visit each player page and get velocity
    console.log('📊 Step 2: Fetching velocity data from player pages...\n');
    
    const results = [];
    let totalVelocity = 0;
    let velocityCount = 0;

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      
      process.stdout.write(`  [${i + 1}/${players.length}] ${player.name}... `);
      
      const velocity = await getPlayerVelocity(player.url, player.name);
      
      if (velocity) {
        console.log(`✅ ${velocity} mph`);
        results.push({
          name: player.name,
          velocity: velocity,
          url: player.url
        });
        totalVelocity += velocity;
        velocityCount++;
      } else {
        console.log('⚠️  No velocity data');
      }

      // Rate limiting - wait between requests
      await delay(500);
    }

    // Step 3: Calculate and display results
    console.log('\n' + '='.repeat(50));
    console.log('RESULTS');
    console.log('='.repeat(50));

    if (velocityCount > 0) {
      const averageVelocity = (totalVelocity / velocityCount).toFixed(1);
      
      console.log(`\n📊 Total Players: ${players.length}`);
      console.log(`📊 Players with Velocity Data: ${velocityCount}`);
      console.log(`📊 Average Pitching Velocity: ${averageVelocity} mph\n`);

      // Sort by velocity
      results.sort((a, b) => b.velocity - a.velocity);

      console.log('Top Velocities:');
      results.slice(0, 10).forEach((player, i) => {
        console.log(`  ${i + 1}. ${player.name}: ${player.velocity} mph`);
      });

      // Save to CSV
      const csvContent = 'Name,Velocity (mph),Profile URL\n' + 
        results.map(p => `"${p.name}",${p.velocity},${p.url}`).join('\n');
      
      const filename = `team-velocity-${Date.now()}.csv`;
      fs.writeFileSync(filename, csvContent);
      console.log(`\n💾 Saved detailed results to: ${filename}`);

      return {
        totalPlayers: players.length,
        playersWithVelocity: velocityCount,
        averageVelocity: parseFloat(averageVelocity),
        players: results
      };

    } else {
      console.log('\n❌ No velocity data found for any players');
      console.log('This could mean:');
      console.log('  - Velocity data is behind a paywall');
      console.log('  - The page structure has changed');
      console.log('  - Players are not pitchers');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the scraper
const rosterUrl = process.argv[2] || 'https://www.perfectgame.org/events/Rosters.aspx?event=1289';

scrapeTeamVelocity(rosterUrl)
  .then(() => {
    console.log('\n✅ Scraping complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Scraping failed:', error.message);
    process.exit(1);
  });
