import * as fs from 'fs';
import * as path from 'path';

async function extractText() {
    try {
        const pdf = require('pdf-parse');
        const dataBuffer = fs.readFileSync(path.join(process.cwd(), 'public', 'Novo Site Econet.pdf'));
        const data = await pdf(dataBuffer);
        fs.writeFileSync(path.join(process.cwd(), 'public', 'Novo Site Econet.txt'), data.text);
        console.log('PDF text extracted to Novo Site Econet.txt');
    } catch (e) {
        console.error('pdf-parse missing or failed, trying pdf2json');
        try {
            const PDFParser = require("pdf2json");
            const pdfParser = new PDFParser();

            pdfParser.on("pdfParser_dataError", (errData: any) => console.error(errData.parserError) );
            pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
                fs.writeFileSync(path.join(process.cwd(), 'public', 'Novo Site Econet.txt'), pdfParser.getRawTextContent());
                console.log('PDF text extracted to Novo Site Econet.txt using pdf2json');
            });

            pdfParser.loadPDF(path.join(process.cwd(), 'public', 'Novo Site Econet.pdf'));
        } catch(e2) {
            console.error('Both failed');
        }
    }
}
extractText();