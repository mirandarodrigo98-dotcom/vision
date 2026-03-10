require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL não definida no .env ou ambiente.');
    process.exit(1);
}

// Ocultar senha para log
const safeConnectionString = connectionString.replace(/:([^:@]+)@/, ':***@');
console.log('Usando DATABASE_URL:', safeConnectionString);

const isNeon = connectionString.includes('neon.tech');
const sslConfig = (isNeon || process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : undefined;

console.log('SSL Config:', sslConfig);

const pool = new Pool({
  connectionString: connectionString,
  ssl: sslConfig
});

async function run() {
  try {
    console.log('Conectando ao banco de dados...');
    const client = await pool.connect();
    console.log('Conexão estabelecida.');
    
    try {
        console.log("Consultando empresa '107'...");
        const res = await client.query("SELECT id, nome, razao_social, code, capital_social_centavos, address_type, address_street FROM client_companies WHERE code = '107'");
        
        if (res.rows.length === 0) {
            console.log('Nenhuma empresa encontrada com o código 107.');
        } else {
            console.log('Empresa encontrada:');
            console.log(JSON.stringify(res.rows[0], null, 2));
        }
    } finally {
        client.release();
    }
  } catch (err) {
    console.error('Erro ao consultar banco de dados:', err);
    if (err.message.includes('password')) {
        console.error('Dica: Verifique se a senha no DATABASE_URL está correta e se não há caracteres especiais que precisam ser escapados.');
    }
  } finally {
    await pool.end();
  }
}

run();
