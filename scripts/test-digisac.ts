import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.replace(/\r/g, '');
    }
  });
}

async function testDigisac() {
  const { sendDigisacMessage } = await import('../src/app/actions/integrations/digisac');
  const { getDigisacConfig } = await import('../src/app/actions/integrations/digisac');
  
  const config = await getDigisacConfig();
  if (!config) return console.log("No config");

  // Create a dummy small PDF base64 for testing
  const dummyPdfBase64 = "JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCj4+CiAgPj4KICAvQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8CiAgL1R5cGUgL0ZvbnQKICAvU3VidHlwZSAvVHlwZTExCiAgL0Jhc2VGb250IC9UaW1lcy1Sb21hbgo+PgplbmRvYmoKCjUgMCBvYmoKPDwKICAvTGVuZ3RoIDIxCj4+CnN0cmVhbQpCVAovRjEgMTggVGYKMCUwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDE2NyAwMDAwMCBuIAowMDAwMDAwMjg1IDAwMDAwIG4gCjAwMDAwMDAzNzMgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDQ1CiUlRU9GCg==";
  const base64File = `data:application/pdf;base64,${dummyPdfBase64}`;

  console.log("Testing text only...");
  let res = await sendDigisacMessage({
    number: "5524999999999", // Replace with a valid number for testing if needed, or just let it fail at digisac level but not 500
    serviceId: config.connection_phone,
    body: "Teste de envio de texto"
  });
  console.log("Text only result:", res);

  console.log("Testing with base64 string...");
  res = await sendDigisacMessage({
    number: "5524999881980", 
    serviceId: config.connection_phone,
    body: "Teste técnico do sistema Vision: Envio de PDF em Base64.",
    base64File: base64File
  });
  console.log("Base64 result:", res);

  process.exit(0);
}

testDigisac();
