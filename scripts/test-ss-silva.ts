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

async function test() {
    const { default: db } = await import('../src/lib/db');
    const company = await db.prepare("SELECT * FROM client_companies WHERE razao_social ILIKE '%SS SILVA REIS%'").get();
    if (!company) {
        console.log("Not found");
        return;
    }
    console.log("Company:", company);
    const phones = await db.prepare("SELECT * FROM company_phones WHERE company_id = ?").all(company.id);
    const cidocas = await db.prepare("SELECT * FROM client_companies WHERE razao_social ILIKE '%CIDOCAS%'").get();
    if (cidocas) {
        console.log("CIDOCAS Phones:", await db.prepare("SELECT * FROM company_phones WHERE company_id = ?").all(cidocas.id));
    }
}
test();