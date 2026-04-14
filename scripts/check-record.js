const fs = require('fs');

const records = JSON.parse(fs.readFileSync('scripts/parsed_records.json', 'utf8'));
const rjCosmetics = records.filter(r => r.cest === '20.059.00');
console.log(rjCosmetics);
