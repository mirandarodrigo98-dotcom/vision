const fs = require('fs');
const path = require('path');
const PDFParser = require("pdf2json");

async function extractText() {
    try {
        const pdfParser = new PDFParser(this, 1); // 1 = raw text
        
        pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
        pdfParser.on("pdfParser_dataReady", pdfData => {
            fs.writeFileSync(path.join(process.cwd(), 'public', 'Novo Site Econet.txt'), pdfParser.getRawTextContent());
            console.log('PDF text extracted to Novo Site Econet.txt');
        });

        pdfParser.loadPDF(path.join(process.cwd(), 'public', 'Novo Site Econet.pdf'));
    } catch (e) {
        console.error('pdf2json failed:', e);
    }
}
extractText();