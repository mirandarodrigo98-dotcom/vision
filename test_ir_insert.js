const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  try {
    const userRes = await pool.query('SELECT id FROM users LIMIT 1');
    const userId = userRes.rows[0].id;
    const sql = `
      INSERT INTO ir_declarations (
        name, year, phone, email, type, company_id, status, is_received, send_whatsapp, send_email, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Não Iniciado', false, $7, $8, $9)
      RETURNING id
    `;
    const params = ['Test', '2025', '123', 'a@a.com', 'Particular', null, true, true, userId];
    const res = await pool.query(sql, params);
    console.log(res.rows);
  } catch(e) {
    console.error("ERROR:", e);
  } finally {
    pool.end();
  }
}
test();