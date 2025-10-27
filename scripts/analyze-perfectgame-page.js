const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function analyzePage() {
  console.log('=== Analyzing Perfect Game Page Structure ===\n');

  try {
    const response = await axios.get('https://www.perfectgame.org/events/Rosters.aspx?event=1289', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Save full HTML for inspection
    fs.writeFileSync('perfectgame-page.html', response.data);
    console.log('✅ Saved full HTML to: perfectgame-page.html\n');

    // Look for tables
    console.log('📊 Tables found:', $('table').length);
    
    // Look for specific text patterns
    console.log('\n🔍 Looking for velocity-related content:');
    const bodyText = $('body').text();
    
    const velocityMatches = bodyText.match(/\d+\s*mph/gi);
    if (velocityMatches) {
      console.log(`Found ${velocityMatches.length} velocity mentions:`);
      velocityMatches.slice(0, 10).forEach(match => console.log(`  - ${match}`));
    } else {
      console.log('No "mph" mentions found');
    }

    // Look for player data
    console.log('\n👥 Looking for player names/data:');
    $('table').each((i, table) => {
      const $table = $(table);
      const rows = $table.find('tr').length;
      if (rows > 5) {
        console.log(`\nTable ${i + 1}: ${rows} rows`);
        console.log('First few rows:');
        $table.find('tr').slice(0, 3).each((j, row) => {
          const text = $(row).text().trim().replace(/\s+/g, ' ');
          console.log(`  Row ${j + 1}: ${text.substring(0, 100)}`);
        });
      }
    });

    // Look for divs with class containing "roster" or "player"
    console.log('\n📦 Looking for roster/player containers:');
    $('[class*="roster"], [class*="player"], [id*="roster"], [id*="player"]').each((i, el) => {
      console.log(`  - ${el.name}.${$(el).attr('class') || $(el).attr('id')}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

analyzePage();
