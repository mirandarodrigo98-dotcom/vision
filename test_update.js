const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbUrlMatch) process.env.DATABASE_URL = dbUrlMatch[1];

const db = require('./src/lib/db').default;

async function test() {
  try {
    const res = await db.prepare('SELECT id FROM ir_declarations LIMIT 1').get();
    if (!res) return;
    const session = { user_id: 'b6f634d0-51a8-4903-b09e-71177651a248' }; // dummy user ID if possible, let's just get a real one
    const userRes = await db.prepare('SELECT id FROM users LIMIT 1').get();
    session.user_id = userRes.id;
    
    await db.transaction(async () => {
      await db.prepare(`
        UPDATE ir_declarations 
        SET name = $1, cpf = $2, phone = $3, email = $4, type = $5, company_id = $6, updated_at = NOW()
        WHERE id = $7
      `).run('Test Name', '12345678901', '11999999999', 'test@test.com', 'Sócio', null, res.id);

      await db.prepare(`
        INSERT INTO ir_interactions (declaration_id, user_id, type, content)
        VALUES ($1, $2, 'comment', $3)
      `).run(res.id, session.user_id, 'Dados do contribuinte atualizados');
    })();
      
    console.log('Transaction successful');
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
