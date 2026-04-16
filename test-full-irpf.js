const fs = require('fs');
const PDFDocument = require('pdfkit');
const PDFParser = require('pdf2json');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('output_test_irpf.pdf'));
doc.text('TOTAL RENDIMENTOS TRIBUTÁVEIS                      74.685,31');
doc.text('IMPOSTO DEVIDO                                      4.691,88');
doc.text('IMPOSTO A RESTITUIR');
doc.text('              ');
doc.text('                 ');
doc.text('QUALQUER OUTRA COISA NO MEIO DA TELA AQUI');
doc.text('    1.250,00     ');
doc.text('SALDO DO IMPOSTO A PAGAR');
doc.end();

setTimeout(() => {
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
    pdfParser.on("pdfParser_dataReady", pdfData => {
        let lines = [];
        
        if (pdfData && pdfData.Pages) {
            pdfData.Pages.forEach((page) => {
                if (page.Texts) {
                    page.Texts.forEach((t) => {
                        const textStr = decodeURIComponent(t.R[0].T);
                        const y = Math.round(t.y * 2) / 2; // tolerance of 0.5
                        const x = t.x;
                        
                        let line = lines.find(l => l.y === y);
                        if (!line) {
                            line = { y, items: [] };
                            lines.push(line);
                        }
                        line.items.push({ x, textStr });
                    });
                }
            });
        }

        lines.sort((a, b) => a.y - b.y);
        lines.forEach(l => l.items.sort((a, b) => a.x - b.x));

        const fullText = lines.map(l => l.items.map(i => i.textStr).join(' ')).join('\n');
        
        const cleanText = fullText.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').toUpperCase();
        console.log("CLEAN TEXT:\n", cleanText);

        let restitutionValue = '';

        const regexRestituir = /IMPOSTO A RESTITUIR.{0,150}?([\d\.\s]+,\d{2})/;
        const regexRestituir2 = /VALOR DA RESTITUI[CÇ][AÃ]O.{0,150}?([\d\.\s]+,\d{2})/;
        
        const matchRest = cleanText.match(regexRestituir);
        if (matchRest) {
          restitutionValue = matchRest[1].trim().replace(/\s+/g, '');
        } else {
            const matchRest2 = cleanText.match(regexRestituir2);
            if (matchRest2) {
                restitutionValue = matchRest2[1].trim().replace(/\s+/g, '');
            } else {
                const matchRest3 = cleanText.match(/RESTITUIR.{0,150}?([\d\.\s]+,\d{2})/);
                if (matchRest3) restitutionValue = matchRest3[1].trim().replace(/\s+/g, '');
            }
        }
        
        console.log("Extracted Value:", restitutionValue);
    });
    pdfParser.loadPDF("output_test_irpf.pdf");
}, 1000);