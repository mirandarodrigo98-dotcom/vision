
const pdfParse = require('pdf-parse');
console.log('Type of pdfParse:', typeof pdfParse);
console.log('Keys of pdfParse:', Object.keys(pdfParse));
console.log('Is PDFParse in keys?', 'PDFParse' in pdfParse);
if (typeof pdfParse === 'function') {
    console.log('pdfParse is a function/class');
}
