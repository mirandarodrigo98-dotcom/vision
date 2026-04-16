const fs = require('fs');
const PDFDocument = require('pdfkit');
const PDFParser = require('pdf2json');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('output.pdf'));
doc.text('TOTAL RENDIMENTOS TRIBUTÁVEIS                      74.685,31');
doc.text('IMPOSTO DEVIDO                                      4.691,88');
doc.text('IMPOSTO A RESTITUIR                                 1.560,34');
doc.text('SALDO DO IMPOSTO A PAGAR');
doc.end();

setTimeout(() => {
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
    pdfParser.on("pdfParser_dataReady", pdfData => {
        const text = pdfParser.getRawTextContent();
        console.log("TEXT EXTRACTED:", JSON.stringify(text));
        
        const cleanText = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').toUpperCase();
        console.log("CLEAN TEXT:", cleanText);

        const matchRest = cleanText.match(/IMPOSTO A RESTITUIR[^\d]*?(\d{1,3}(?:\.\d{3})*,\d{2})/);
        console.log("MATCH:", matchRest ? matchRest[1] : null);
    });
    pdfParser.loadPDF("output.pdf");
}, 1000);