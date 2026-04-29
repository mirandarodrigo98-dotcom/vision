require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  const q = 'SELECT d.*, COALESCE(cc.razao_social, cc.nome) as company_name, e.name as employee_name FROM dismissals d JOIN client_companies cc ON d.company_id = cc.id JOIN employees e ON d.employee_id = e.id WHERE 1=1 AND (d.company_id IS NULL OR d.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1)) ORDER BY d.created_at DESC';
  const res = await client.query(q, ['75b75f58-2346-4164-81e3-84a7732546a0']);
  const dismissalsData = res.rows;
  const dismissals = dismissalsData.map(dismissal => ({ ...dismissal, dismissal_date: dismissal.dismissal_date ? new Date(dismissal.dismissal_date).toISOString() : null, created_at: dismissal.created_at ? new Date(dismissal.created_at).toISOString() : null, updated_at: dismissal.updated_at ? new Date(dismissal.updated_at).toISOString() : null })); 
  console.log('Successfully mapped', dismissals.length);
  await client.end();
}

run();