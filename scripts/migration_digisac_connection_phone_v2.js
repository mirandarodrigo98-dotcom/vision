const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Tentar carregar variáveis de ambiente manualmente
const envPath = path.resolve(__dirname, '../.env');
console.log('Procurando .env em:', envPath);

let connectionString = process.env.DATABASE_URL;

if (!connectionString && fs.existsSync(envPath)) {
  console.log('Arquivo .env encontrado. Lendo...');
  const envConfig = fs.readFileSync(envPath, 'utf8');
  const lines = envConfig.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;
    
    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex === -1) continue;
    
    const key = trimmedLine.substring(0, separatorIndex).trim();
    
    if (key === 'DATABASE_URL') {
        let value = trimmedLine.substring(separatorIndex + 1).trim();
        // Remover aspas se existirem
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        connectionString = value;
        console.log('DATABASE_URL encontrada no .env');
        break;
    }
  }
}

if (!connectionString) {
  console.error('ERRO: DATABASE_URL não encontrada nem nas variáveis de ambiente nem no arquivo .env');
  process.exit(1);
}

console.log('Tentando conectar ao banco de dados...');
// Log truncado da connection string para debug (sem senha)
const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
console.log('URL de conexão:', maskedUrl);

const ssl = connectionString.includes('sslmode=require') || connectionString.includes('neon.tech')
  ? { rejectUnauthorized: false } 
  : undefined;

const pool = new Pool({
  connectionString,
  ssl,
});

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    console.log('Conexão estabelecida com sucesso!');

    console.log('Iniciando migração Digisac Connection Phone...');

    // Verificar se a tabela existe
    const tableCheck = await client.query(`
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'digisac_config'
        );
    `);
    
    if (!tableCheck.rows[0].exists) {
        console.log('Tabela digisac_config não existe. Criando...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS digisac_config (
                id INTEGER PRIMARY KEY,
                base_url TEXT NOT NULL DEFAULT 'https://api.digisac.com.br',
                api_token TEXT,
                is_active INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    // Adicionar coluna connection_phone se não existir
    await client.query(`
      ALTER TABLE digisac_config 
      ADD COLUMN IF NOT EXISTS connection_phone TEXT;
    `);
    
    console.log('Coluna connection_phone verificada/adicionada com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err);
    // Se o erro for de conexão, pode ser útil tentar sem SSL ou com outras opções, mas para Neon precisa de SSL.
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

migrate();
