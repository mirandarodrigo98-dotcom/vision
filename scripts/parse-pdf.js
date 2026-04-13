const fs = require('fs');
const path = require('path');

async function extractText() {
    try {
        const pdf = require('pdf-parse');
        const dataBuffer = fs.readFileSync(path.join(process.cwd(), 'public', 'Novo Site Econet.pdf'));
        const data = await pdf(dataBuffer);
        fs.writeFileSync(path.join(process.cwd(), 'public', 'Novo Site Econet.txt'), data.text);
        console.log('PDF text extracted to Novo Site Econet.txt');
    } catch (e) {
        console.error('pdf-parse failed:', e);
    }
}
extractText();