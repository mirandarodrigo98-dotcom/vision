const fs = require('fs');
const data = fs.readFileSync('scripts/compare.json', 'utf8');
const t1 = JSON.parse(data.split('7133180532: ')[1].split('7166017918: ')[0]);
const t2 = JSON.parse(data.split('7166017918: ')[1]);

for (const key in t1) {
    if (JSON.stringify(t1[key]) !== JSON.stringify(t2[key])) {
        console.log(key, t1[key], t2[key]);
    }
}