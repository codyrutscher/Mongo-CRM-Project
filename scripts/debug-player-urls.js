const axios = require('axios');
const cheerio = require('cheerio');

async function debugPlayerUrls() {
  console.log('=== Debugging Player URLs ===\n');
  
  const rosterUrl = 'https://www.perfectgame.org/events/Rosters.aspx?event=1289';
  
  try {
    const response = await axios.get(rosterUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    console.log('First 20 player links found:\n');
    
    let count = 0;
    $('a[href*="/Players/Playerprofile.aspx"]').each((i, element) => {
      if (count >= 20) return;
      
      const href = $(element).attr('href');
      const playerName = $(element).text().trim();
      
      if (href && playerName) {
        const fullUrl = href.startsWith('http') 
          ? href 
          : `https://www.perfectgame.org${href}`;
        
        console.log(`${count + 1}. ${playerName}`);
        console.log(`   Original href: ${href}`);
        console.log(`   Full URL: ${fullUrl}\n`);
        count++;
      }
    });

    // Try to fetch one of the actual roster players
    console.log('\n=== Testing actual player URL ===\n');
    
    const testUrl = 'https://www.perfectgame.org/Players/Playerprofile.aspx?ID=164580';
    console.log(`Trying to fetch: ${testUrl}`);
    
    try {
      const testResponse = await axios.get(testUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      console.log('✅ Successfully fetched player page!');
      console.log(`Status: ${testResponse.status}`);
    } catch (error) {
      console.log('❌ Failed to fetch player page');
      console.log(`Error: ${error.message}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugPlayerUrls();
