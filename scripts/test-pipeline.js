const { downloadBoletoPdfServer } = require('./src/app/actions/integrations/omie');
const fs = require('fs');

async function testPdfGeneration() {
  const dummyPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  console.log('Baixando PDF...');
  const result = await downloadBoletoPdfServer(dummyPdfUrl);
  if (result.error) {
      console.error(result.error);
      return;
  }
  
  let base64Data = result.base64;
  
  // Simulating what happens in digisac.ts
  if (base64Data.includes('base64,')) {
      base64Data = base64Data.split('base64,')[1];
  }
  base64Data = base64Data.replace(/[\r\n\s]+/g, '');

  const buffer = Buffer.from(base64Data, 'base64');
  
  // Header should be %PDF-
  console.log('Header do PDF final:', buffer.subarray(0, 5).toString('utf-8'));
  
  fs.writeFileSync('teste_final_pipeline.pdf', buffer);
  console.log('PDF salvo com sucesso! Se o header for %PDF-, o arquivo é válido.');
}
testPdfGeneration();