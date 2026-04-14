import { downloadBoletoPdfServer } from './src/app/actions/integrations/omie';
import fs from 'fs';

async function testPdfGeneration() {
  const url = 'https://app.omie.com.br/api/v1/financas/contareceber/boleto/?codigo_lancamento_omie=1147&banco=033'; 
  // Let's use a dummy URL if we don't have one, but we actually need a REAL Omie boleto URL.
  // Wait, I can just use any PDF URL to test the pipeline!
  const dummyPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  console.log('Baixando PDF...');
  const result = await downloadBoletoPdfServer(dummyPdfUrl);
  if (result.error) {
      console.error(result.error);
      return;
  }
  
  let base64Data = result.base64 as string;
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