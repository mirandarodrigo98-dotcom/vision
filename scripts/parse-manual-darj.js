const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('manual_darj.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('manual_darj.txt', data.text);
    console.log("PDF text extracted");
});