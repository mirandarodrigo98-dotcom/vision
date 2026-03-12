
try {
    const pdfParseNode = require('pdf-parse/node');
    console.log('Successfully required pdf-parse/node');
    console.log('Keys:', Object.keys(pdfParseNode));
} catch (e) {
    console.error('Failed to require pdf-parse/node:', e);
}
