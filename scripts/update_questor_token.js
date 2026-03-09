
const Database = require('better-sqlite3');
const db = new Database('vision.db');

// USO: node scripts/update_questor_token.js "SEU_NOVO_TOKEN_AQUI"

const newToken = process.argv[2];

if (!newToken) {
    console.error('Por favor, forneça o novo token como argumento.');
    console.error('Exemplo: node scripts/update_questor_token.js "7yU9tK2s..."');
    process.exit(1);
}

try {
    const stmt = db.prepare("UPDATE questor_syn_config SET api_token = ?, updated_at = datetime('now') WHERE id = 1");
    const info = stmt.run(newToken);
    
    if (info.changes > 0) {
        console.log('✅ Token atualizado com sucesso!');
        
        // Verificar atualização
        const config = db.prepare('SELECT * FROM questor_syn_config WHERE id = 1').get();
        console.log('Configuração Atual:', config);
    } else {
        console.error('❌ Nenhuma linha atualizada. Verifique se a configuração existe (ID=1).');
    }
} catch (e) {
    console.error('Erro ao atualizar banco de dados:', e.message);
}
