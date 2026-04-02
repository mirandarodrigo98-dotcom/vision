const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbUrlMatch) process.env.DATABASE_URL = dbUrlMatch[1];
const db = require('./src/lib/db').default;
const { v4: uuidv4 } = require('uuid');

async function test() {
  try {
    const res = await db.prepare('SELECT id FROM ir_declarations LIMIT 1').get();
    if (!res) { console.log('No declarations'); return; }
    
    const userRes = await db.prepare('SELECT id FROM users LIMIT 1').get();
    const session = { user_id: userRes.id };
    
    const buffer = Buffer.from('test', 'utf8');
    const id = res.id;
    const companyName = 'NZD CONTABILIDADE';
    const fileName = 'test.pdf';
    
    let publicUrl = '';
    
    await db.transaction(async () => {
      const interactionId = uuidv4();
      await db.prepare(`
        INSERT INTO ir_interactions (id, declaration_id, user_id, type, content)
        VALUES ($1, $2, $3, 'document', $4)
      `).run(interactionId, id, session.user_id, `Recibo gerado (${companyName})`);
      
      await db.prepare(`
        INSERT INTO ir_attachments (interaction_id, original_name, size_bytes, url)
        VALUES ($1, $2, $3, $4)
      `).run(interactionId, fileName, buffer.length, publicUrl);
    })();
    console.log('Transaction successful');
  } catch (err) {
    console.error('Error:', err);
  }
}
test();