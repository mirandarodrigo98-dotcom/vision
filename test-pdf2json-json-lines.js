const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfParser = new PDFParser();
pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
pdfParser.on("pdfParser_dataReady", pdfData => {
    let lines = [];
    pdfData.Pages.forEach(page => {
        page.Texts.forEach(t => {
            const text = decodeURIComponent(t.R[0].T);
            const y = Math.round(t.y * 2) / 2; // tolerance of 0.5
            const x = t.x;
            
            let line = lines.find(l => l.y === y);
            if (!line) {
                line = { y, items: [] };
                lines.push(line);
            }
            line.items.push({ x, text });
        });
    });

    lines.sort((a, b) => a.y - b.y);
    lines.forEach(l => l.items.sort((a, b) => a.x - b.x));

    const fullText = lines.map(l => l.items.map(i => i.text).join(' ')).join('\n').toUpperCase();
    console.log("REBUILT TEXT:\n" + fullText);
});
pdfParser.loadPDF("output2.pdf");