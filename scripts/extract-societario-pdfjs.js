const fs = require('fs');
const path = require('path');

async function run() {
  const mod = await import('pdf-parse');
  const { PDFParse } = mod;
  const pdfPath = path.join(__dirname, '../public/SOCIETARIO.pdf');
  if (!fs.existsSync(pdfPath)) {
    console.error('SOCIETARIO.pdf não encontrado em public/');
    process.exit(1);
  }
  const buffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText({ lineEnforce: true, itemJoiner: ' ' });
  const fullText = textResult.text;
  const outPath = path.join(__dirname, '../public/SOCIETARIO.extracted.txt');
  fs.writeFileSync(outPath, fullText, 'utf8');
  console.log('Extração (pdfjs) concluída:', outPath);
  console.log('Preview:\n', fullText.slice(0, 1200));
}

run().catch((e) => {
  console.error('Falha na extração pdfjs:', e);
  process.exit(1);
});
