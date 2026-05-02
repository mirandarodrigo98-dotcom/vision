require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`SELECT * FROM questor_zen_config LIMIT 1`);
    const config = res.rows[0];
    
    const fileId = '69f5f84a5f0ded192c4a76be';
    let url = `${config.base_url.replace(/\/$/, '')}/api/v1/${config.api_token}/documentos`;
    
    const payload = {
        "CodigoCategoria": "64b6d631273adf21d4750e10", // Documentos
        "CodigoCliente": "", // Empty?
        "CodigoArquivo": fileId,
        "Titulo": "Variaveis_da_Folha.csv",
        "Observacao": "Lançamento via VISION",
        "Atributo": {
            "DataCompetencia": "202401",
        }
    };

    const response = await fetch(url, { 
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const text = await response.text();
    console.log('Document ID:', text);

  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
}

run();