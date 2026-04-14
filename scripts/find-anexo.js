const fs = require('fs');
const text = fs.readFileSync('manual_darj.txt', 'utf8');
const match = text.match(/Anexo I[\s\S]{0,3000}/i);
if (match) {
    console.log(match[0]);
} else {
    console.log("Not found");
}