const fs = require('fs');
const html = fs.readFileSync('postman-content.html', 'utf8');
const urls = html.match(/https?:\/\/[^\s"\'<>]+/g) || [];
console.log([...new Set(urls.filter(u => u.includes('api') || u.includes('questor')))]);