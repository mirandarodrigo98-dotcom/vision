const fs = require('fs');
fetch('https://documenter.gw.postman.com/api/collections/19136635/UyxhonL3?segregateAuth=true&versionTag=latest')
  .then(r => r.json())
  .then(d => {
    fs.writeFileSync('questor-zen-api.json', JSON.stringify(d, null, 2));
    console.log('Saved');
  })
  .catch(console.error);