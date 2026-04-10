import path from 'path';
import fs from 'fs';

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

async function testCobranca() {
    const { getDigisacConfig } = await import('../src/app/actions/integrations/digisac');
    const { uploadFileDigisac } = await import('../src/app/actions/integrations/digisac');
    const conf = await getDigisacConfig();
    
    const dummyPdfBase64 = "JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCj4+CiAgPj4KICAvQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8CiAgL1R5cGUgL0ZvbnQKICAvU3VidHlwZSAvVHlwZTExCiAgL0Jhc2VGb250IC9UaW1lcy1Sb21hbgo+PgplbmRvYmoKCjUgMCBvYmoKPDwKICAvTGVuZ3RoIDIxCj4+CnN0cmVhbQpCVAovRjEgMTggVGYKMCUwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDE2NyAwMDAwMCBuIAowMDAwMDAwMjg1IDAwMDAwIG4gCjAwMDAwMDAzNzMgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDQ1CiUlRU9GCg==";

    const upload = await uploadFileDigisac(dummyPdfBase64, 'teste.pdf', 'application/pdf', 'pdf');
    console.log("Upload result:", upload);

    const payload = {"type":"chat","number":"5524999020251","serviceId":"c7239d0d-000f-4731-97e4-9f69cf2a8d7c","text":"teste auto fallback 9"};
    
    console.log("Sending direct...");
    let response = await fetch(`${conf.base_url}/api/v1/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${conf.api_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok && response.status === 500) {
        console.log("Failed with 500. Retrying without 9...");
        if (payload.number.length === 13 && payload.number.startsWith('55') && payload.number[4] === '9') {
             payload.number = payload.number.substring(0, 4) + payload.number.substring(5);
             response = await fetch(`${conf.base_url}/api/v1/messages`, {
                 method: 'POST',
                 headers: {
                     'Authorization': `Bearer ${conf.api_token}`,
                     'Content-Type': 'application/json'
                 },
                 body: JSON.stringify(payload)
             });
        }
    }
    
    console.log("Final Status:", response.status);
    console.log("Final Response:", await response.text());
}

testCobranca();