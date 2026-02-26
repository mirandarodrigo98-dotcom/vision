require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const ssl = connectionString && connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined;

const pool = new Pool({
  connectionString,
  ssl
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('--- Checking Questor SYN Config ---');
    const configRes = await client.query('SELECT * FROM questor_syn_config WHERE id = 1');
    const config = configRes.rows[0];
    console.log('Config:', config);

    if (!config) {
        console.error('No Questor SYN Config found!');
        return;
    }

    console.log('\n--- Checking Questor SYN Routine (CONTABIL_IMPORT) ---');
    const routineRes = await client.query("SELECT * FROM questor_syn_routines WHERE system_code = 'CONTABIL_IMPORT'");
    const routine = routineRes.rows[0];
    console.log('Routine found:', !!routine);
    if (routine) {
        console.log('Routine Name:', routine.description);
        console.log('Action Name:', routine.action_name);
        console.log('Has Layout Content:', !!routine.layout_content);
    } else {
        console.error('Routine CONTABIL_IMPORT not found!');
    }

    if (config && config.base_url && config.api_token) {
        const url = `${config.base_url}/Integracao/Importar?TokenApi=${encodeURIComponent(config.api_token)}`;
        console.log('\n--- Testing Connectivity ---');
        console.log('URL:', url.replace(config.api_token, '***'));
        
        try {
            // Minimal payload for testing connectivity (might fail validation but should reach server)
            const payload = {
                Leiautes: [],
                Dados: "",
                PodeAlterarDados: true,
                ExecutarValidacaoFinal: "Sim"
            };

            console.log('Fetching...');
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log('Response Status:', response.status);
            console.log('Response Text:', await response.text());
        } catch (error) {
            console.error('Fetch Failed:', error.message);
            console.error('Cause:', error.cause);
        }
    } else {
        console.log('Skipping connectivity test due to missing config.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
