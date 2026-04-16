const fs = require('fs');
const PDFDocument = require('pdfkit');
const PDFParser = require('pdf2json');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('output2.pdf'));
// Draw text out of order
doc.text('1.560,34', 400, 100);
doc.text('IMPOSTO A RESTITUIR', 50, 100);
doc.end();

setTimeout(() => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
    pdfParser.on("pdfParser_dataReady", pdfData => {
        // pdfData.Pages[0].Texts
        console.log(JSON.stringify(pdfData.Pages[0].Texts, null, 2));
    });
    pdfParser.loadPDF("output2.pdf");
}, 1000);