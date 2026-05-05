const fs=require('fs');
const t=fs.readFileSync('questor-zen-api.json','utf8');
const lines = t.split('\n');
lines.forEach((l, i) => {
  if (l.toLowerCase().includes('qnet')) {
    console.log(`Line ${i}: ${l}`);
  }
});