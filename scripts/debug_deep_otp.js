const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(process.cwd(), 'admissao.db');
const db = new Database(dbPath);

const email = 'rodrigo@nzdcontabilidade.com.br';
const tokenInput = '123456';
const tokenHashInput = crypto.createHash('sha256').update(tokenInput).digest('hex');

console.log('--- DEBUG PROFUNDO OTP ---');
console.log(`Email alvo: [${email}]`);
console.log(`Token input: [${tokenInput}]`);
console.log(`Hash input: [${tokenHashInput}]`);

// 1. Verificar horário do banco e do sistema
const dbTime = db.prepare("SELECT datetime('now') as now, datetime('now', 'localtime') as local").get();
console.log(`\nHorário Sistema (Node): ${new Date().toISOString()}`);
console.log(`Horário Banco (UTC):     ${dbTime.now}`);
console.log(`Horário Banco (Local):   ${dbTime.local}`);

// 2. Listar TODOS os tokens para este email (incluindo usados e expirados)
const tokens = db.prepare('SELECT * FROM otp_tokens WHERE email = ? ORDER BY created_at DESC').all(email);
console.log(`\nTokens encontrados no banco para ${email}: ${tokens.length}`);

tokens.forEach((t, i) => {
    console.log(`\nToken #${i + 1} (ID: ${t.id})`);
    console.log(`  Hash no Banco: [${t.token_hash}]`);
    console.log(`  Match Hash?    ${t.token_hash === tokenHashInput ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`  Criado em:     ${t.created_at}`);
    console.log(`  Expira em:     ${t.expires_at}`);
    console.log(`  Usado em:      ${t.used_at}`);
    
    // Teste de validade temporal
    const expiresDate = new Date(t.expires_at + 'Z'); // Forçar UTC se string não tiver Z
    const now = new Date();
    const isNotExpired = new Date(t.expires_at) > new Date(dbTime.now); 
    
    console.log(`  Válido no tempo (Banco)? ${isNotExpired ? '✅ SIM' : '❌ NÃO (Expirado)'}`);
    console.log(`  Não usado?               ${!t.used_at ? '✅ SIM' : '❌ NÃO (Já usado)'}`);

    // Simulação da Query Real
    const sqlCheck = db.prepare(`
        SELECT count(*) as count FROM otp_tokens 
        WHERE email = ? AND token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
    `).get(email, tokenHashInput);
    
    console.log(`  Passaria na Query SQL Real? ${sqlCheck.count > 0 ? '✅ APROVADO' : '❌ REJEITADO'}`);
});
