const fs = require('fs');
const path = require('path');

async function run() {
  const pdfPath = path.join(__dirname, '../public/SOCIETARIO.pdf');
  if (!fs.existsSync(pdfPath)) {
    console.error('SOCIETARIO.pdf não encontrado em public/');
    process.exit(1);
  }
  const dataBuffer = fs.readFileSync(pdfPath);
  const mod = await import('pdf-parse');
  const pdfParse = mod.default || mod;
  const data = await pdfParse(dataBuffer);
  const text = data.text || '';
  const outPath = path.join(__dirname, '../public/SOCIETARIO.extracted.txt');
  fs.writeFileSync(outPath, text, 'utf8');
  console.log('Extração concluída:', outPath);
  console.log('Preview:\n', text.slice(0, 1200));
}

run().catch((e) => {
  console.error('Falha na extração:', e);
  process.exit(1);
});
