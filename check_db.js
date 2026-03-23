const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});
async function check() {
    const query = 'CF';
    const params = [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`];
    const sql = `
      SELECT id, razao_social, nome, cnpj, code 
      FROM client_companies 
      WHERE is_active = 1 
      AND (razao_social ILIKE $1 OR nome ILIKE $2 OR cnpj LIKE $3 OR code LIKE $4)
    `;
    const res = await pool.query(sql, params);
    console.log("CF search results:");
    console.log(res.rows);
    
    // Check what if we don't have is_active = 1? Wait, postgresql is_active is integer or boolean?
    // is_active in client_companies is integer.
    
    await pool.end();
}
check();