
try {
  const pdf = require('pdf-parse');
  console.log('pdf-parse required successfully:', typeof pdf);
} catch (e) {
  console.error('Failed to require pdf-parse:', e);
}

import { PDFParse } from 'pdf-parse';
console.log('PDFParse imported:', PDFParse);
