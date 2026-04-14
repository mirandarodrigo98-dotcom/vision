const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('scripts/doc_extracted_formatted.html', 'utf8');
const $ = cheerio.load(html);

$('tr').each((i, el) => {
    const text = $(el).text();
    if (text.includes('20.057.00') || text.includes('20.059.00')) {
        console.log("Row HTML:");
        console.log($(el).html());
    }
});