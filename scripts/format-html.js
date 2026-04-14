const fs = require('fs');

const html = fs.readFileSync('scripts/doc_extracted.html', 'utf8');

// Let's format the HTML a bit to see it line by line
const formattedHtml = html.replace(/<tr/g, '\n<tr').replace(/<\/tr>/g, '</tr>\n').replace(/<td/g, '\n  <td');

fs.writeFileSync('scripts/doc_extracted_formatted.html', formattedHtml);
console.log("Done formatting");
