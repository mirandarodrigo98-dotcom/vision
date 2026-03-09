const { Pool } = require('pg');
require('dotenv').config();

async function deepProbeZen() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    const resConfig = await pool.query('SELECT * FROM questor_zen_config WHERE id = 1');
    const config = resConfig.rows[0];
    const baseUrl = config.base_url.replace(/\/$/, '');
    const token = config.api_token;
    
    const cnpj = '58520528000171'; // The one from previous log
    
    // 1. Fetch by CNPJ first
    console.log(`\n--- Fetching by CNPJ: ${cnpj} ---`);
    const urlCnpj = `${baseUrl}/api/v1/${token}/clientes/${cnpj}`;
    const resCnpj = await fetch(urlCnpj);
    if (!resCnpj.ok) {
        console.log('Failed to fetch by CNPJ');
        return;
    }
    const data = await resCnpj.json();
    console.log('Main data fetched.');
    
    const codigoCliente = data.CodigoCliente; // GUID
    const companyId = data.CompanyId; // ID
    
    console.log(`CodigoCliente (GUID): ${codigoCliente}`);
    console.log(`CompanyId (ID): ${companyId}`);
    
    // 2. Try fetching by GUID
    if (codigoCliente) {
        const endpointsGuid = [
            `/api/v1/${token}/clientes/${codigoCliente}`,
            `/api/v1/${token}/clientes/${codigoCliente}/enderecos`,
            `/api/v1/${token}/clientes/${codigoCliente}/estabelecimentos`,
            `/api/v1/${token}/clientes/${codigoCliente}/filiais`
        ];
        
        for (const ep of endpointsGuid) {
            const url = `${baseUrl}${ep}`;
            console.log(`\nProbing GUID endpoint: ${url}`);
            const res = await fetch(url);
            console.log(`Status: ${res.status}`);
            if (res.ok) {
                const json = await res.json();
                console.log('Response Keys:', Object.keys(Array.isArray(json) && json.length > 0 ? json[0] : json));
                if (JSON.stringify(json).includes("Logadouro")) console.log("FOUND LOGADOURO HERE!");
            }
        }
    }

    // 3. Try fetching by CompanyId
    if (companyId) {
        const endpointsId = [
            `/api/v1/${token}/clientes/${companyId}`,
            `/api/v1/${token}/clientes/${companyId}/enderecos`,
            `/api/v1/${token}/clientes/${companyId}/estabelecimentos`
        ];
        
        for (const ep of endpointsId) {
            const url = `${baseUrl}${ep}`;
            console.log(`\nProbing CompanyId endpoint: ${url}`);
            const res = await fetch(url);
            console.log(`Status: ${res.status}`);
            if (res.ok) {
                const json = await res.json();
                console.log('Response Keys:', Object.keys(Array.isArray(json) && json.length > 0 ? json[0] : json));
                if (JSON.stringify(json).includes("Logadouro")) console.log("FOUND LOGADOURO HERE!");
            }
        }
    }
    
    // 4. Try searching via query param
    const urlSearch = `${baseUrl}/api/v1/${token}/clientes?filter=InscricaoFederal=${cnpj}`;
    console.log(`\nProbing Search endpoint: ${urlSearch}`);
    const resSearch = await fetch(urlSearch);
    console.log(`Status: ${resSearch.status}`);
    if (resSearch.ok) {
        // This likely returns 405 based on previous test, but worth double checking if syntax is right
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

deepProbeZen();
