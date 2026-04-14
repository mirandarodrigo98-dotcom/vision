const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('scripts/doc_extracted_formatted.html', 'utf8');
const $ = cheerio.load(html);

$('tr').each((i, el) => {
    const text = $(el).text();
    if (text.includes('20.057.00') || text.includes('20.059.00')) {
        console.log("Found row:");
        const tds = $(el).find('td').map((j, td) => $(td).text().trim().replace(/\s+/g, ' ')).get();
        console.log(tds);
    }
});
