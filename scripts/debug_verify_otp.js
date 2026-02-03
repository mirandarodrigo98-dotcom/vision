const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(process.cwd(), 'admissao.db');
const db = new Database(dbPath);

const email = 'rodrigo@nzdcontabilidade.com.br';
const token = '123456';
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

console.log('--- DEBUG ALL TOKENS ---');
const tokens = db.prepare('SELECT * FROM otp_tokens WHERE email = ? ORDER BY created_at DESC').all(email);
console.log(JSON.stringify(tokens, null, 2));

console.log('\n--- TIME CHECK ---');
const sqlTime = db.prepare("SELECT datetime('now') as now").get().now;
const jsTime = new Date().toISOString();
console.log(`SQLite datetime('now'): ${sqlTime}`);
console.log(`JS new Date().toISOString(): ${jsTime}`);

console.log('\n--- VERIFICATION SIMULATION ---');
// Tentar buscar o token válido exato
const validToken = db.prepare(`
    SELECT * FROM otp_tokens 
    WHERE email = ? 
    AND token_hash = ? 
    AND used_at IS NULL 
    AND expires_at > datetime('now')
`).get(email, tokenHash);

if (validToken) {
    console.log('✅ FOUND VALID TOKEN:', validToken);
} else {
    console.log('❌ NO VALID TOKEN FOUND via SQL Query.');
    
    // Check why
    const potential = db.prepare(`
        SELECT * FROM otp_tokens 
        WHERE email = ? AND token_hash = ? AND used_at IS NULL
    `).get(email, tokenHash);
    
    if (potential) {
        console.log('Found unused token, but check expiry:');
        console.log(`Expires: ${potential.expires_at}`);
        console.log(`Now (SQL): ${sqlTime}`);
        console.log(`Comparison (Expires > Now): ${potential.expires_at > sqlTime}`);
    } else {
        console.log('No unused token found with this hash.');
    }
}
