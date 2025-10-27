const fs = require('fs');

const csv = fs.readFileSync('team-velocity-1760726422314.csv', 'utf8');
const lines = csv.split('\n').slice(1).filter(l => l.trim());
const velocities = lines.map(l => parseInt(l.split(',')[1])).filter(v => !isNaN(v)).sort((a,b) => a-b);

const target = 88;
const belowTarget = velocities.filter(v => v < target).length;
const atTarget = velocities.filter(v => v === target).length;
const aboveTarget = velocities.filter(v => v > target).length;
const percentile = ((belowTarget + atTarget/2) / velocities.length * 100).toFixed(1);

console.log('=== Percentile Analysis for 88 mph ===\n');
console.log('Total players with velocity data:', velocities.length);
console.log('Players below 88 mph:', belowTarget);
console.log('Players at 88 mph:', atTarget);
console.log('Players above 88 mph:', aboveTarget);
console.log('');
console.log('📊 88 mph is at the ' + percentile + 'th percentile');
console.log('');
console.log('This means 88 mph is faster than ' + ((belowTarget / velocities.length * 100).toFixed(1)) + '% of players');
console.log('');
console.log('Velocity Range:');
console.log('  Minimum: ' + velocities[0] + ' mph');
console.log('  25th percentile: ' + velocities[Math.floor(velocities.length * 0.25)] + ' mph');
console.log('  Median (50th): ' + velocities[Math.floor(velocities.length * 0.5)] + ' mph');
console.log('  75th percentile: ' + velocities[Math.floor(velocities.length * 0.75)] + ' mph');
console.log('  88 mph: ' + percentile + 'th percentile ⭐');
console.log('  Maximum: ' + velocities[velocities.length - 1] + ' mph');
