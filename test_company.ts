const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbUrlMatch) process.env.DATABASE_URL = dbUrlMatch[1];
import db from './src/lib/db';

async function test() {
  const company = (await db.query(`
    SELECT id, razao_social, nome, cnpj, telefone, email_contato, 
           address_type, address_street, address_number, address_complement, 
           address_neighborhood, address_zip_code, municipio, uf
    FROM client_companies
    WHERE UPPER(razao_social) = UPPER($1) OR UPPER(nome) = UPPER($1)
    LIMIT 1
  `, ['NZD CONTABILIDADE'])).rows[0];
  console.log(company);
}
test();
