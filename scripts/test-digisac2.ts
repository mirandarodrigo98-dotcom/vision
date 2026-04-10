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

async function testDigisacDirect() {
  const { getDigisacConfig } = await import('../src/app/actions/integrations/digisac');
  
  const config = await getDigisacConfig();
  if (!config) return console.log("No config");

  const dummyPdfBase64 = "JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCj4+CiAgPj4KICAvQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8CiAgL1R5cGUgL0ZvbnQKICAvU3VidHlwZSAvVHlwZTExCiAgL0Jhc2VGb250IC9UaW1lcy1Sb21hbgo+PgplbmRvYmoKCjUgMCBvYmoKPDwKICAvTGVuZ3RoIDIxCj4+CnN0cmVhbQpCVAovRjEgMTggVGYKMCUwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDE2NyAwMDAwMCBuIAowMDAwMDAwMjg1IDAwMDAwIG4gCjAwMDAwMDAzNzMgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDQ1CiUlRU9GCg==";

  const payload = {
    text: "Teste com mimetype",
    type: "file",
    number: "5524999881980",
    serviceId: config.connection_phone,
    file: dummyPdfBase64,
    base64: true,
    mimetype: "application/pdf",
    name: "boleto.pdf"
  };

  const realPdfBase64 = fs.readFileSync('dummy.pdf', 'base64');
  
  const uploadPayload = {
      base64: realPdfBase64,
      name: "boleto_real.pdf",
      mimetype: "application/pdf",
      extension: "pdf"
  };

  console.log("Testing upload with real base64...");
  const responseUpload = await fetch(`${config.base_url}/api/v1/files`, {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${config.api_token}`,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(uploadPayload)
  });
  const uploadText = await responseUpload.text();
  console.log("Upload Status:", responseUpload.status);
  console.log("Upload Response:", uploadText);
  
  if (responseUpload.ok) {
    const uploadData = JSON.parse(uploadText);
    const payloadMessage = {
      text: "Teste com fileId de PDF real",
      type: "file",
      number: "5524999881980",
      serviceId: config.connection_phone,
      fileId: uploadData.id
    };

    const responseMsg = await fetch(`${config.base_url}/api/v1/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.api_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadMessage)
    });
    console.log("Msg Status:", responseMsg.status);
    console.log("Msg Response:", await responseMsg.text());
  }
}

testDigisacDirect();
