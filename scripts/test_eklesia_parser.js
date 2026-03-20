const fs = require('fs');
const PDFParser = require('pdf2json');

async function test() {
    const buffer = fs.readFileSync('public/Relatorio[1504].pdf');
    
    try {
        const lines = await new Promise((resolve, reject) => {
            const pdfParser = new PDFParser(null, 1);
            pdfParser.on("pdfParser_dataError", (errData) => {
                console.error("Error inside parser:", errData.parserError);
                reject(errData.parserError);
            });
            pdfParser.on("pdfParser_dataReady", (pdfData) => {
                console.log("PDF parsed successfully");
                let extractedLines = [];
                if (pdfData && pdfData.Pages) {
                    pdfData.Pages.forEach((page) => {
                        let pageLines = [];
                        if (page.Texts) {
                            page.Texts.forEach((t) => {
                                let textStr = decodeURIComponent(t.R[0].T);
                                let y = t.y;
                                let x = t.x;
                                let line = pageLines.find(l => Math.abs(l.y - y) < 0.3);
                                if (!line) {
                                    line = { y: y, items: [] };
                                    pageLines.push(line);
                                }
                                line.items.push({ x: x, text: textStr });
                            });
                            pageLines.sort((a, b) => a.y - b.y);
                            pageLines.forEach(l => {
                                l.items.sort((a, b) => a.x - b.x);
                                let lineText = l.items.map((i) => i.text).join('   ');
                                extractedLines.push(lineText);
                            });
                        }
                    });
                }
                resolve(extractedLines);
            });
            pdfParser.parseBuffer(buffer);
        });
        console.log("Lines extracted:", lines.length);
        console.log("First 10 lines:");
        console.log(lines.slice(0, 10).join('\n'));
    } catch (e) {
        console.error("Caught error:", e);
    }
}

test();
