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

async function testDigisacMessages() {
  const { getDigisacConfig } = await import('../src/app/actions/integrations/digisac');
  const conf = await getDigisacConfig();
  
  const omieUrl = "https://cdn.omie.com.br/repository/8be3cd703fc046da1e1bb954f786b360/2804e1fe76796a001096b31b688b04de/nzd_vencto_05_04_2026_doc_1203_bol_157_cli_52914393000142.pdf?response-content-type=application%2Fpdf&AWSAccessKeyId=AKIA4INFFOTW64RNC5N7&Expires=1775823211&Signature=MwQJMytrmnooY2DZtxILYLTsvRM%3D";

  console.log("Downloading from Omie...");
  const dl = await fetch(omieUrl);
  const ab = await dl.arrayBuffer();
  const base64Data = Buffer.from(ab).toString('base64');
  console.log("Omie PDF size:", ab.byteLength);

  const payloadMessage = {
      text: "Teste PDF embutido (165kb)",
      type: "file",
      number: "5524999881980",
      serviceId: conf.connection_phone,
      file: {
          base64: base64Data, // STRICT BASE64 WITHOUT PREFIX!
          mimetype: "application/pdf",
          name: "boleto_oficial.pdf"
      }
  };

  try {
      const responseMsg = await fetch(`${conf.base_url}/api/v1/messages`, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${conf.api_token}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(payloadMessage)
      });
      console.log("Msg Status:", responseMsg.status);
      console.log("Msg Response:", await responseMsg.text());
  } catch (e: any) {
      console.log("Error:", e.message);
  }
}
testDigisacMessages();
