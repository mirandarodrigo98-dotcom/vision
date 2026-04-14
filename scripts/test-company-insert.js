const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const id = require('crypto').randomUUID();
pool.query(`
INSERT INTO client_companies (
  id, nome, razao_social, cnpj, telefone, email_contato, code, filial, municipio, uf, data_abertura, capital_social_centavos,
  address_type, address_street, address_number, address_complement, address_neighborhood, address_zip_code, is_active, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 1, NOW(), NOW())
`, [id, 'Test', null, '12345', null, null, 'C112', 'F1', null, null, null, null, null, null, null, null, null, null])
.then(res => { console.log('OK'); pool.end(); })
.catch(e => { console.error(e); pool.end(); });
