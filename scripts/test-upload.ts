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

async function testUpload() {
  const { getDigisacConfig } = await import('../src/app/actions/integrations/digisac');
  const conf = await getDigisacConfig();
  
  // Minimal PDF base64
  const minimalPdf = "JVBERi0xLjAKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA1OTUgODQyXT4+CmVuZG9iago0IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYKMDAwMDAwMDAxMCAwMDAwMCBuCjAwMDAwMDAwNTMgMDAwMDAgbgowMDAwMDAwMTA2IDAwMDAwIG4KMDAwMDAwMDE4MSAwMDAwMCBuCnRyYWlsZXIKPDwvU2l6ZSA1L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMjY5CiUlRU9GCg==";
  
  const uploadPayload = {
      base64: "data:application/pdf;base64," + minimalPdf,
      name: "minimal1.pdf",
      mimetype: "application/pdf",
      extension: "pdf"
  };

  console.log("Testing upload with data URI...");
  let responseUpload = await fetch(`${conf.base_url}/api/v1/files`, {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${conf.api_token}`,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(uploadPayload)
  });
  console.log("Status 1:", responseUpload.status);
  console.log("Response 1:", await responseUpload.text());
  
  const uploadPayload2 = {
      base64: minimalPdf,
      name: "minimal2.pdf"
  };

  console.log("\nTesting upload without data URI...");
  responseUpload = await fetch(`${conf.base_url}/api/v1/files`, {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${conf.api_token}`,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(uploadPayload2)
  });
  console.log("Status 2:", responseUpload.status);
  let r2 = await responseUpload.json();
  console.log("Response 2:", r2);
  
  const formData = new FormData();
  const fileBlob = new Blob([Buffer.from(minimalPdf, 'base64')], { type: 'application/pdf' });
  formData.append('file', fileBlob, 'minimal3.pdf');
  // API Digisac is tricky, we might need just 'file' or maybe some other field?
  // Let's try base64 as part of form data?
  const formData2 = new FormData();
  formData2.append('base64', minimalPdf);
  formData2.append('name', 'minimal4.pdf');

  console.log("\nTesting upload with FormData (file field)...");
  formData.append('mimetype', 'application/pdf');
  formData.append('extension', 'pdf');
  formData.append('name', 'minimal3.pdf');
  
  responseUpload = await fetch(`${conf.base_url}/api/v1/files`, {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${conf.api_token}`
      },
      body: formData
  });
  console.log("Status 4:", responseUpload.status);
  let r4 = await responseUpload.json();
  console.log("Response 4:", r4);
  
  if (r4.url) {
      console.log("Downloading from", r4.url);
      const dl = await fetch(r4.url);
      const ab = await dl.arrayBuffer();
      fs.writeFileSync('minimal4_downloaded.pdf', Buffer.from(ab));
      console.log("Downloaded size:", ab.byteLength);
      console.log("Head:", Buffer.from(ab).toString('utf8').substring(0, 50));
  }
}

testUpload();
